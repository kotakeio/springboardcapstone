// ------------------------------------------------------------------
// Module:    controllers/freedomBlocks.controller.js
// Author:    John Gibson
// Created:   2025-04-20
// Purpose:   Manage "freedom" time blocks: generate from calendar + user
//            inputs, and expose CRUD endpoints.
// ------------------------------------------------------------------

/**
 * @module FreedomBlocksController
 * @description
 *   - Generates daily free-time blocks by merging calendar busy slots
 *     with user overrides.
 *   - Exposes endpoints to create, fetch, update, approve, delete blocks.
 *   - Integrates with Google Calendar and phone alarm service.
 */

// ─────────────── Dependencies ───────────────
const dayjs = require("dayjs");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
const minMax = require("dayjs/plugin/minMax");

dayjs.extend(isSameOrAfter);
dayjs.extend(minMax);

const freedomTimeBlocks = require("../models/freedomTimeBlocks");
const UserEmail         = require("../models/userEmail");
const {
  getBusyTimesUntil,
  listAppointments
} = require("../services/calendar/appointments.service");
const {
  calculateFreeIntervals,
  breakDownFreeTime
} = require("../services/blocks/timeBlocks.util");
const { roundToNearest5Min } = require("../services/blocks/roundTime.util");
const phoneAlarmService      = require("../services/phoneAlarm.service");

// ─────────────── Utility Functions ───────────────

/**
 * Delay execution by the specified milliseconds.
 * @param {number} ms - Time to wait before resolving.
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    timer.unref(); // Allow process to exit if this timer is alone.
  });
}

/**
 * Merge overlapping busy intervals into consolidated ISO intervals.
 * @param {Array<{start: string, end: string}>} busyArr - Input intervals.
 * @returns {Array<{start: string, end: string}>} - Merged intervals.
 */
function mergeBusyIntervals(busyArr) {
  if (!busyArr.length) return [];

  // Convert to dayjs for comparisons.
  let intervals = busyArr.map(b => ({
    start: dayjs(b.start),
    end:   dayjs(b.end)
  }));

  // Sort by start time to prepare for merge loop.
  intervals.sort((a, b) => a.start.valueOf() - b.start.valueOf());

  const merged = [];
  let current = intervals[0];

  for (let i = 1; i < intervals.length; i++) {
    const next = intervals[i];
    if (next.start.isBefore(current.end)) {
      // Extend current end to cover overlap.
      current.end = dayjs.max(current.end, next.end);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  // Format back to ISO strings.
  return merged.map(i => ({
    start: i.start.toISOString(),
    end:   i.end.toISOString()
  }));
}

// ─────────────── Core Logic ───────────────

/**
 * Generate and store today’s free-time blocks if needed.
 * @param {string[]} calendarIds - Calendar email IDs to query.
 * @returns {Promise<Array|Object>} - New blocks or placeholder when after day end.
 */
async function generateTodayBlocksIfNeeded(calendarIds) {
  const tz       = "America/Denver";
  const now      = dayjs().tz(tz);
  const endOfDay = now.endOf("day");

  if (now.isAfter(endOfDay)) {
    // No generation past end of day.
    return { now, busyArray: [] };
  }

  // 1. Fetch calendar busy slots.
  const { busyArray } = await getBusyTimesUntil(calendarIds, endOfDay);

  // 2. Define today's boundaries.
  const dateToday  = now.format("YYYY-MM-DD");
  const startOfDay = dayjs.tz(`${dateToday} 00:00`, "YYYY-MM-DD HH:mm", tz).toDate();
  const endOfDayDt = dayjs.tz(`${dateToday} 23:59`, "YYYY-MM-DD HH:mm", tz).toDate();

  // 3. Retrieve user-defined/approved/excluded blocks.
  const userBlocks = await freedomTimeBlocks.find({
    sourceType: { $in: ["manual", "approved", "excluded"] },
    startTime:  { $gte: startOfDay },
    endTime:    { $lte: endOfDayDt }
  });

  // 4. Convert them to ISO intervals in correct timezone.
  const userBusy = userBlocks.map(blk => ({
    start: dayjs(blk.startTime).tz(tz).toISOString(),
    end:   dayjs(blk.endTime).tz(tz).toISOString()
  }));

  // 5. Merge calendar + user busy intervals.
  const mergedBusy = mergeBusyIntervals(busyArray.concat(userBusy));

  // 6. Compute free intervals between now and end of day.
  const freeIntervals = calculateFreeIntervals(now, endOfDay, mergedBusy);

  // Apply safety buffer to avoid edge conflicts.
  const bufferMin = 5;
  const adjusted  = freeIntervals
    .map(i => {
      const s = i.start.add(bufferMin, "minute");
      const e = i.end.subtract(bufferMin, "minute");
      return e.isAfter(s) ? { start: s, end: e } : null;
    })
    .filter(Boolean);

  // 7. Break adjusted intervals into discrete blocks.
  const blocks = breakDownFreeTime(adjusted);

  // 8. Build mongoose documents.
  const docs = blocks.map(b => {
    const [h1, m1] = b.start.split(":");
    const [h2, m2] = b.end.split(":");
    return {
      startTime:  dayjs.tz(`${dateToday} ${h1}:${m1}`, "YYYY-MM-DD HH:mm", tz).toDate(),
      endTime:    dayjs.tz(`${dateToday} ${h2}:${m2}`, "YYYY-MM-DD HH:mm", tz).toDate(),
      approved:   false,
      sourceType: "auto"
    };
  });

  // 9. Insert new blocks if present.
  if (docs.length) {
    // TODO(jg): prevent duplicate insertions on rapid calls.
    return await freedomTimeBlocks.insertMany(docs);
  }
  return [];
}

// ─────────────── Endpoints ───────────────

/**
 * POST /freedom-blocks
 * Force creation of today's freedom blocks.
 *
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
async function createFreedomTimeBlocks(req, res) {
  try {
    const emails   = await UserEmail.find({ userId: req.user._id, deletedAt: null });
    const verified = emails.filter(ue => ue.isCalendarOnboarded);

    if (!verified.length) {
      return res.json({
        success:  true,
        verified: false,
        message:  "No verified calendar emails. Please verify or add one.",
        emails
      });
    }

    const ids    = verified.map(ue => ue.email);
    const blocks = await generateTodayBlocksIfNeeded(ids);

    return res.json({
      success:  true,
      verified: true,
      blocks,
      message:  "Time blocks created (unapproved) and stored in DB."
    });
  } catch (err) {
    console.error("Error in createFreedomTimeBlocks:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /freedom-blocks/schedule
 * Retrieve today's appointments and free-time blocks.
 *
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
async function getTodaySchedule(req, res) {
  try {
    const tz         = "America/Denver";
    const dateToday  = dayjs().tz(tz).format("YYYY-MM-DD");
    const startOfDay = dayjs.tz(`${dateToday} 00:00`, "YYYY-MM-DD HH:mm", tz).toDate();
    const endOfDay   = dayjs.tz(`${dateToday} 23:59`, "YYYY-MM-DD HH:mm", tz).toDate();

    // Fetch existing blocks for today.
    let existingBlocks = await freedomTimeBlocks.find({
      startTime: { $gte: startOfDay },
      endTime:   { $lte: endOfDay }
    }).sort({ startTime: 1 });

    const userEmails = await UserEmail.find({ userId: req.user._id, deletedAt: null });
    const verified   = userEmails.filter(ue => ue.isCalendarOnboarded);

    if (!verified.length) {
      // Provide placeholder when no calendars are onboarded.
      const sampleAppt = {
        id:      "sample",
        summary: "Sample Appointment",
        start:   dayjs().hour(10).minute(0).toISOString(),
        end:     dayjs().hour(10).minute(30).toISOString()
      };
      return res.json({
        success:      true,
        verified:     false,
        message:      "Please verify your calendar email(s).",
        appointments: [sampleAppt],
        timeBlocks:   []
      });
    }

    const ids = verified.map(ue => ue.email);

    // Regenerate auto blocks if stale or missing.
    const autoBlocks = existingBlocks.filter(b => !b.approved && b.sourceType === "auto");
    if (autoBlocks.length) {
      await freedomTimeBlocks.deleteMany({ _id: { $in: autoBlocks.map(b => b._id) } });
      existingBlocks = await generateTodayBlocksIfNeeded(ids);
    } else if (!existingBlocks.length) {
      existingBlocks = await generateTodayBlocksIfNeeded(ids);
    }

    // Re-fetch and filter out excluded blocks.
    const todayBlocks = await freedomTimeBlocks.find({
      startTime: { $gte: startOfDay },
      endTime:   { $lte: endOfDay },
      sourceType:{ $nin: ["excluded"] }
    }).sort({ startTime: 1 });

    // Aggregate Google Calendar appointments.
    let allAppointments = [];
    for (const calId of ids) {
      const appts = await listAppointments(calId, startOfDay, endOfDay);
      allAppointments = allAppointments.concat(appts);
    }

    return res.json({
      success:      true,
      verified:     true,
      message:      "Fetched today's schedule with updated freedom blocks.",
      appointments: allAppointments,
      timeBlocks:   todayBlocks,
      emails:       userEmails
    });
  } catch (err) {
    console.error("Error in getTodaySchedule:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * PUT /freedom-blocks/:id
 * Update a freedom block’s start and end times.
 *
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
async function updateFreedomBlock(req, res) {
  try {
    const { id }          = req.params;
    let { startTime, endTime } = req.body;

    const block = await freedomTimeBlocks.findById(id);
    if (!block) {
      return res.status(404).json({ success: false, message: "Block not found" });
    }

    // Round to nearest 5-minute increments.
    const newStart = roundToNearest5Min(dayjs(startTime));
    const newEnd   = roundToNearest5Min(dayjs(endTime));
    if (!newStart.isValid() || !newEnd.isValid()) {
      return res.status(400).json({ success: false, message: "Invalid date/time" });
    }
    if (newStart.isSameOrAfter(newEnd)) {
      return res.status(400).json({
        success: false,
        message: "Start time must be before end time (after rounding)."
      });
    }

    // Prevent overlap with non-excluded blocks.
    const overlap = await freedomTimeBlocks.findOne({
      _id:        { $ne: id },
      sourceType: { $nin: ["excluded"] },
      startTime:  { $lt: newEnd.toDate() },
      endTime:    { $gt: newStart.toDate() }
    });
    if (overlap) {
      return res.status(400).json({
        success: false,
        message: "Collision: Overlaps another block (after rounding)."
      });
    }

    // Soft-exclude leftover interval if block is shortened.
    if (newEnd.isBefore(dayjs(block.endTime))) {
      await freedomTimeBlocks.create({
        startTime:  newEnd.toDate(),
        endTime:    block.endTime,
        approved:   false,
        sourceType: "excluded",
        deletedAt:  new Date()
      });
    }

    // Apply manual update.
    block.startTime  = newStart.toDate();
    block.endTime    = newEnd.toDate();
    block.sourceType = "manual";
    await block.save();

    return res.json({
      success:      true,
      block,
      snappedStart: newStart.toISOString(),
      snappedEnd:   newEnd.toISOString()
    });
  } catch (err) {
    console.error("Error in updateFreedomBlock:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /freedom-blocks/approve
 * Approve all unapproved blocks and trigger notifications.
 *
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
async function approveAllBlocks(req, res) {
  try {
    const tz         = "America/Denver";
    const dateToday  = dayjs().tz(tz).format("YYYY-MM-DD");
    const startOfDay = dayjs.tz(`${dateToday} 00:00`, "YYYY-MM-DD HH:mm", tz).toDate();
    const endOfDay   = dayjs.tz(`${dateToday} 23:59`, "YYYY-MM-DD HH:mm", tz).toDate();

    // Select blocks pending approval.
    const unapproved = await freedomTimeBlocks.find({
      approved:   false,
      sourceType: { $nin: ["excluded"] },
      startTime:  { $gte: startOfDay },
      endTime:    { $lte: endOfDay }
    }).sort({ startTime: 1 });

    // Mark them approved.
    for (const blk of unapproved) {
      blk.approved    = true;
      blk.sourceType  = "approved";
      await blk.save();
    }

    const webhookUrl = process.env.FREEDOM_APP_TASKMAGIC_WEBHOOK;
    if (!webhookUrl) {
      console.warn("No TaskMagic webhook configured, skipping.");
    }

    // Trigger each block’s webhook & phone alarm.
    for (let i = 0; i < unapproved.length; i++) {
      const blk  = unapproved[i];
      const sd   = dayjs(blk.startTime);
      const ed   = dayjs(blk.endTime);
      const body = JSON.stringify({
        startHour: sd.format("H"),
        startMin:  sd.format("m"),
        endHour:   ed.format("H"),
        endMin:    ed.format("m")
      });

      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body
          });
        } catch (err) {
          console.error("TaskMagic webhook error:", err.message);
        }
      }

      // Schedule phone alarm at block end time.
      try {
        await phoneAlarmService.setPhoneAlarm(ed.format("HH:mm"));
      } catch (err) {
        console.error("Phone alarm error:", err.message);
      }

      // Stagger requests to avoid rate limits.
      if (i < unapproved.length - 1) {
        await delay(15000);
      }
    }

    return res.json({
      success: true,
      message: `Approved ${unapproved.length} blocks and sent notifications.`
    });
  } catch (err) {
    console.error("Error in approveAllBlocks:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * DELETE /freedom-blocks/:id
 * Soft-exclude a block so it will not be regenerated.
 *
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
async function deleteBlock(req, res) {
  try {
    const { id }  = req.params;
    const block   = await freedomTimeBlocks.findById(id);
    if (!block) {
      return res.status(404).json({ success: false, message: "Block not found" });
    }

    // Mark block as excluded instead of hard-deleting.
    block.sourceType = "excluded";
    block.deletedAt  = new Date();
    await block.save();

    return res.json({ success: true, message: "Block marked as excluded" });
  } catch (err) {
    console.error("Error in deleteBlock:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /freedom-blocks/:id/alarm
 * Set a phone alarm for the end time of a specific block.
 *
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
async function setBlockAlarm(req, res) {
  try {
    const { id }  = req.params;
    const block   = await freedomTimeBlocks.findById(id);
    if (!block) {
      return res.status(404).json({ success: false, message: "Block not found" });
    }

    await phoneAlarmService.setPhoneAlarm(dayjs(block.endTime).format("HH:mm"));
    return res.json({ success: true, message: `Alarm set for block ${id}` });
  } catch (err) {
    console.error("Error in setBlockAlarm:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /freedom-blocks/:id/taskmagic
 * Trigger the TaskMagic webhook for a specific block.
 *
 * @param {Object} req - Express request.
 * @param {Object} res - Express response.
 * @returns {Promise<void>}
 */
async function setBlockTaskMagic(req, res) {
  try {
    const webhookUrl = process.env.FREEDOM_APP_TASKMAGIC_WEBHOOK;
    if (!webhookUrl) {
      return res.status(500).json({ success: false, message: "TaskMagic webhook not configured" });
    }

    const { id }  = req.params;
    const block   = await freedomTimeBlocks.findById(id);
    if (!block) {
      return res.status(404).json({ success: false, message: "Block not found" });
    }

    const sd   = dayjs(block.startTime);
    const ed   = dayjs(block.endTime);
    const body = JSON.stringify({
      startHour: sd.format("H"),
      startMin:  sd.format("m"),
      endHour:   ed.format("H"),
      endMin:    ed.format("m")
    });

    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });
    const text = await resp.text();

    return res.json({
      success:         true,
      message:         `TaskMagic called for block ${id}`,
      webhookResponse: text
    });
  } catch (err) {
    console.error("Error in setBlockTaskMagic:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createFreedomTimeBlocks,
  getTodaySchedule,
  updateFreedomBlock,
  approveAllBlocks,
  deleteBlock,
  setBlockAlarm,
  setBlockTaskMagic
};
