// controllers/freedomBlocks.controller.js (Updated for Mongoose)
const dayjs = require("dayjs");
const isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
dayjs.extend(isSameOrAfter);

// Import the Mongoose models
const freedomTimeBlocks = require("../models/freedomTimeBlocks");
const UserEmail = require("../models/userEmail");

// Import helper services and utilities
const { getBusyTimesUntil, listAppointments } = require("../services/calendar/appointments.service");
const { calculateFreeIntervals, breakDownFreeTime } = require("../services/blocks/timeBlocks.util");
const { roundToNearest5Min } = require("../services/blocks/roundTime.util");
const phoneAlarmService = require("../services/phoneAlarm.service");

// Utility function for delay
function delay(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref(); // Allow the process to exit if this is the only active timer
  });
}

/**
 * HELPER: Reads calendars, calculates free intervals, and writes blocks to DB.
 * Returns an array of newly created freedomTimeBlocks documents.
 */
async function generateTodayBlocksIfNeeded(calendarIds) {
  // 1) Decide end-of-day for block generation
  const endTime = dayjs().tz("America/Denver").set("hour", 16).set("minute", 0);
  const currentTime = dayjs().tz("America/Denver");

  if (currentTime.isAfter(endTime)) {
    return { now: currentTime, busyArray: [] };
  }
  
  // 2) Gather busy times from Google for the given verified calendarIds
  const { now, busyArray } = await getBusyTimesUntil(calendarIds, endTime);

  // 3) Convert busy times to free intervals
  const freeIntervals = calculateFreeIntervals(now, endTime, busyArray);

  // 4) Break free intervals into time blocks
  const blocks = breakDownFreeTime(freeIntervals);

  // 5) Build documents to insert
  const dateToday = dayjs().tz("America/Denver").format("YYYY-MM-DD");
  const blockRecords = blocks.map((b) => {
    const [startH, startM] = b.start.split(":");
    const [endH, endM] = b.end.split(":");
    const startTime = dayjs.tz(`${dateToday} ${startH}:${startM}`, "YYYY-MM-DD HH:mm", "America/Denver").toDate();
    const endTimeObj = dayjs.tz(`${dateToday} ${endH}:${endM}`, "YYYY-MM-DD HH:mm", "America/Denver").toDate();
    return {
      startTime,
      endTime: endTimeObj,
      approved: false,
    };
  });

  // 6) Save to DB using insertMany if there are any blocks
  if (blockRecords.length) {
    const createdDocs = await freedomTimeBlocks.insertMany(blockRecords);
    return createdDocs;
  } else {
    return [];
  }
}

/**
 * Endpoint: Force creation of today's freedom blocks.
 */
async function createFreedomTimeBlocks(req, res) {
  try {
    const userEmails = await UserEmail.find({ userId: req.user._id, deletedAt: null });
    // Filter for only verified emails
    const verifiedEmails = userEmails.filter(ue => ue.isCalendarOnboarded);
    if (verifiedEmails.length === 0) {
      return res.json({
        success: true,
        verified: false,
        message: "No verified calendar emails. Please verify or add a calendar email.",
        emails: userEmails
      });
    }
    const calendarIds = verifiedEmails.map(ue => ue.email);

    console.log('createFreedomTimeBlocks - Verified Emails:', calendarIds);

    const createdDocs = await generateTodayBlocksIfNeeded(calendarIds);
    return res.json({
      success: true,
      verified: true,
      blocks: createdDocs,
      message: "Time blocks created (unapproved) and stored in DB.",
    });
  } catch (err) {
    console.error("Error in createFreedomTimeBlocks:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Endpoint: GET today's schedule (appointments + time blocks).
 */
async function getTodaySchedule(req, res) {
  try {
    const dateToday = dayjs().tz("America/Denver").format("YYYY-MM-DD");
    const startOfDay = dayjs(`${dateToday} 00:00`, "YYYY-MM-DD HH:mm").tz("America/Denver").toDate();
    const endOfDay = dayjs(`${dateToday} 23:59`, "YYYY-MM-DD HH:mm").tz("America/Denver").toDate();

    // Fetch existing blocks
    let existingBlocks = await freedomTimeBlocks.find({
      startTime: { $gte: startOfDay },
      endTime: { $lte: endOfDay }
    }).sort({ startTime: 1 });

    const userEmails = await UserEmail.find({ userId: req.user._id, deletedAt: null });
    // Filter for verified emails only
    const verifiedEmails = userEmails.filter(ue => ue.isCalendarOnboarded);

    // Instead of immediately returning if no verified emails, we always show the calendar.
    if (verifiedEmails.length === 0) {
      // Return a sample appointment response if no emails are verified.
      const sampleAppointment = {
        id: "sample",
        summary: "Sample Appointment",
        start: dayjs().hour(10).minute(0).toISOString(),
        end: dayjs().hour(10).minute(30).toISOString(),
      };
      return res.json({
        success: true,
        verified: false,
        message: "Please verify your calendar email(s) to unlock full features.",
        appointments: [sampleAppointment],
        timeBlocks: []
      });
    }

    const calendarIds = verifiedEmails.map(ue => ue.email);

    //—New logic: If there exist unapproved freedom blocks, re-calculate them.
    if (existingBlocks.length > 0) {
      const unapprovedBlocks = existingBlocks.filter(block => !block.approved);
      if (unapprovedBlocks.length > 0) {
        // Hard-delete the unapproved blocks
        await freedomTimeBlocks.deleteMany({
          _id: { $in: unapprovedBlocks.map(b => b._id) }
        });
        console.log("Unapproved freedom blocks deleted for regeneration.");
        // After deletion, generate fresh blocks
        await generateTodayBlocksIfNeeded(calendarIds);
      }
    } else {
      // If no blocks exist, generate them.
      await generateTodayBlocksIfNeeded(calendarIds);
    }

    // Query again for today's blocks after potential regeneration.
    const todayBlocks = await freedomTimeBlocks.find({
      startTime: { $gte: startOfDay },
      endTime: { $lte: endOfDay }
    }).sort({ startTime: 1 });

    // Fetch today's appointments from Google for each verified email.
    let allAppointments = [];
    for (const calId of calendarIds) {
      const appts = await listAppointments(calId, startOfDay, endOfDay);
      allAppointments = allAppointments.concat(appts);
    }

    return res.json({
      success: true,
      verified: true,
      message: "Fetched today's schedule with updated freedom blocks.",
      appointments: allAppointments,
      timeBlocks: todayBlocks,
      emails: userEmails
    });
  } catch (err) {
    console.error("Error in getTodaySchedule:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Endpoint: Update a freedom block.
 */
async function updateFreedomBlock(req, res) {
  try {
    const id = req.params.id;
    const { startTime, endTime } = req.body; // Expect ISO strings

    // Find the block by its ID
    const block = await freedomTimeBlocks.findById(id);
    if (!block) {
      return res.status(404).json({ success: false, message: "Block not found" });
    }

    let newStart = dayjs(startTime);
    let newEnd = dayjs(endTime);

    if (!newStart.isValid() || !newEnd.isValid()) {
      return res.status(400).json({ success: false, message: "Invalid date/time" });
    }

    // Round times to the nearest 5-minute boundary
    newStart = roundToNearest5Min(newStart);
    newEnd = roundToNearest5Min(newEnd);

    if (newStart.isSameOrAfter(newEnd)) {
      return res.status(400).json({
        success: false,
        message: "Start time must be before end time (after rounding).",
      });
    }

    // Collision check with other blocks
    const overlapping = await freedomTimeBlocks.findOne({
      _id: { $ne: block._id },
      startTime: { $lt: newEnd.toDate() },
      endTime: { $gt: newStart.toDate() },
    });
    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: "Collision: Overlaps another block (after rounding).",
      });
    }

    // Update and save the block
    block.startTime = newStart.toDate();
    block.endTime = newEnd.toDate();
    await block.save();

    return res.json({
      success: true,
      block,
      snappedStart: newStart.toISOString(),
      snappedEnd: newEnd.toISOString(),
    });
  } catch (err) {
    console.error("Error in updateFreedomBlock:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Endpoint: Approve all blocks.
 */
async function approveAllBlocks(req, res) {
  try {
    const dateToday = dayjs().format("YYYY-MM-DD");
    const startOfDay = dayjs(`${dateToday} 00:00`, "YYYY-MM-DD HH:mm").toDate();
    const endOfDay = dayjs(`${dateToday} 23:59`, "YYYY-MM-DD HH:mm").toDate();

    const unapprovedBlocks = await freedomTimeBlocks.find({
      approved: false,
      startTime: { $gte: startOfDay },
      endTime: { $lte: endOfDay }
    }).sort({ startTime: 1 });

    for (const block of unapprovedBlocks) {
      block.approved = true;
      await block.save();
    }

    const webhookUrl = process.env.FREEDOM_APP_TASKMAGIC_WEBHOOK;
    if (!webhookUrl) {
      console.warn("No FREEDOM_APP_TASKMAGIC_WEBHOOK found in .env, skipping TaskMagic calls.");
    }

    for (let i = 0; i < unapprovedBlocks.length; i++) {
      const block = unapprovedBlocks[i];
      const startDayjs = dayjs(block.startTime);
      const endDayjs = dayjs(block.endTime);

      const startHour = startDayjs.format("H");
      const startMin = startDayjs.format("m");
      const endHour = endDayjs.format("H");
      const endMin = endDayjs.format("m");

      if (webhookUrl) {
        const body = JSON.stringify({ startHour, startMin, endHour, endMin });
        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
          const text = await response.text();
          console.log("TaskMagic webhook response:", text);
        } catch (err) {
          console.error("Error calling TaskMagic webhook:", err.message);
        }
      }

      try {
        const endTimeStr = endDayjs.format("HH:mm");
        await phoneAlarmService.setPhoneAlarm(endTimeStr);
        console.log(`Alarm set for block ending at ${endTimeStr}`);
      } catch (err) {
        console.error(`Error setting phone alarm:`, err.message);
      }

      if (i < unapprovedBlocks.length - 1) {
        await delay(15000);
      }
    }

    return res.json({
      success: true,
      message: `Approved ${unapprovedBlocks.length} blocks, and triggered TaskMagic + phone alarms.`,
    });
  } catch (err) {
    console.error("Error in approveAllBlocks:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Endpoint: Delete a block.
 */
async function deleteBlock(req, res) {
  try {
    const id = req.params.id;
    const block = await freedomTimeBlocks.findById(id);
    if (!block) {
      return res.status(404).json({ success: false, message: "Block not found" });
    }
    await block.deleteOne();
    return res.json({ success: true, message: "Block deleted" });
  } catch (err) {
    console.error("Error in deleteBlock:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Endpoint: Set a block's phone alarm.
 */
async function setBlockAlarm(req, res) {
  try {
    const id = req.params.id;
    const block = await freedomTimeBlocks.findById(id);
    if (!block) {
      return res.status(404).json({ success: false, message: "Block not found" });
    }
    const endTime = dayjs(block.endTime).format("HH:mm");
    await phoneAlarmService.setPhoneAlarm(endTime);
    return res.json({ success: true, message: `Alarm set for block ${id} at ${endTime}` });
  } catch (err) {
    console.error("Error in setBlockAlarm:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Endpoint: Trigger TaskMagic for a block.
 */
async function setBlockTaskMagic(req, res) {
  try {
    const webhookUrl = process.env.FREEDOM_APP_TASKMAGIC_WEBHOOK;
    if (!webhookUrl) {
      return res.status(500).json({ success: false, message: "No TaskMagic webhook set in env" });
    }
    const id = req.params.id;
    const block = await freedomTimeBlocks.findById(id);
    if (!block) {
      return res.status(404).json({ success: false, message: "Block not found" });
    }
    const startDayjs = dayjs(block.startTime);
    const endDayjs = dayjs(block.endTime);
    const startHour = startDayjs.format("H");
    const startMin = startDayjs.format("m");
    const endHour = endDayjs.format("H");
    const endMin = endDayjs.format("m");
    const body = JSON.stringify({ startHour, startMin, endHour, endMin });
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const text = await response.text();
    return res.json({
      success: true,
      message: `TaskMagic called for block ${id}`,
      webhookResponse: text,
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
  setBlockTaskMagic,
};
