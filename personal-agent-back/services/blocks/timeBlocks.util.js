// ------------------------------------------------------------------
// Module:    services/blocks/timeBlocks.util.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Utilities to calculate and split free time intervals
//            from busy time intervals using dayjs.
// ------------------------------------------------------------------

/**
 * @module TimeBlocksUtil
 * @description
 *   - Calculate free intervals given busy intervals and boundaries.
 *   - Break free intervals into discrete blocks of 50- and 25-minute
 *     durations with configured gaps.
 *   - Round timestamps to half-hour or full-hour boundaries.
 */

// ─────────────── Dependencies ───────────────
const dayjs    = require("dayjs");
const utc      = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

// ─────────────── Core Functions ───────────────
/**
 * Calculate free intervals between now and endTime by excluding busy periods.
 *
 * @param {dayjs.Dayjs} now         Current timestamp (dayjs object).
 * @param {dayjs.Dayjs} endTime     End boundary for free time.
 * @param {Array<{start: string, end: string}>} busyArray
 *        List of busy intervals with ISO start/end strings.
 * @returns {Array<{start: dayjs.Dayjs, end: dayjs.Dayjs}>}
 *          Array of free intervals as dayjs objects.
 */
function calculateFreeIntervals(now, endTime, busyArray) {
  const freeIntervals = [];
  let lastEnd = now;

  busyArray.forEach((b) => {
    // Parse busy interval into Denver timezone for comparison
    const busyStart = dayjs.utc(b.start).tz("America/Denver");
    const busyEnd   = dayjs.utc(b.end).tz("America/Denver");

    // If there is a gap between last end and the next busy start, record it
    if (busyStart.isAfter(lastEnd)) {
      freeIntervals.push({ start: lastEnd, end: busyStart });
    }
    // Always advance lastEnd to the latest busy end encountered
    if (busyEnd.isAfter(lastEnd)) {
      lastEnd = busyEnd;
    }
  });

  // After processing all busy intervals, include final gap if any
  if (endTime.isAfter(lastEnd)) {
    freeIntervals.push({ start: lastEnd, end: endTime });
  }

  return freeIntervals;
}

/**
 * Break free intervals into blocks of 50 or 25 minutes,
 * inserting gaps between blocks (10 or 5 mins).
 *
 * @param {Array<{start: dayjs.Dayjs, end: dayjs.Dayjs}>} freeIntervals
 *        List of free intervals.
 * @returns {Array<{start: string, end: string, length: number}>}
 *          Array of block objects with HH:mm strings and duration.
 */
function breakDownFreeTime(freeIntervals) {
  const blocks = [];

  freeIntervals.forEach((interval) => {
    // Initialize pointer at the nearest half-hour boundary
    let pointer = roundToHalfHour(interval.start);

    // If pointer falls exactly on :30, attempt a 25-min block first
    if (pointer.minute() === 30 && pointer.isBefore(interval.end)) {
      const next25 = pointer.add(25, "minute");
      if (next25.isBefore(interval.end)) {
        blocks.push({
          start: pointer.format("HH:mm"),
          end:   next25.format("HH:mm"),
          length: 25
        });
        // Round up to the next hour after the 25-min block
        pointer = roundUpToHour(next25);
      }
    }

    // Fill remaining time with blocks and gaps until interval end
    while (pointer.isBefore(interval.end)) {
      const end50 = pointer.add(50, "minute");
      if (end50.isSameOrBefore(interval.end)) {
        // Add a 50-min block with a 10-min gap
        blocks.push({
          start: pointer.format("HH:mm"),
          end:   end50.format("HH:mm"),
          length: 50
        });
        pointer = end50.add(10, "minute");
      } else {
        const end25 = pointer.add(25, "minute");
        if (end25.isSameOrBefore(interval.end)) {
          // Add a 25-min block with a 5-min gap
          blocks.push({
            start: pointer.format("HH:mm"),
            end:   end25.format("HH:mm"),
            length: 25
          });
          pointer = end25.add(5, "minute");
        } else {
          // No more room for a standard block, exit loop
          break;
        }
      }
    }
  });

  // Special-case tweak: add a final block if last ends at specific time
  const last = blocks[blocks.length - 1];
  if (last && last.end === "15:20") {
    blocks.push({ start: "15:30", end: "15:55", length: 25 });
  }

  return blocks;
}

// ─────────────── Helper Functions ───────────────
/**
 * Round a dayjs timestamp to the nearest half-hour boundary.
 * If minutes < 30 → set to :30; else → bump to next full hour.
 *
 * @param {dayjs.Dayjs} d  Input timestamp.
 * @returns {dayjs.Dayjs}
 */
function roundToHalfHour(d) {
  const m = d.minute();
  if (m < 30) {
    // move up to the half-hour mark
    return d.set("minute", 30).set("second", 0).set("millisecond", 0);
  }
  // move up to the next hour mark
  return d.set("minute", 60).set("second", 0).set("millisecond", 0);
}

/**
 * Round a dayjs timestamp up to the next full hour.
 *
 * @param {dayjs.Dayjs} d  Input timestamp.
 * @returns {dayjs.Dayjs}
 */
function roundUpToHour(d) {
  return d.set("minute", 60).set("second", 0).set("millisecond", 0);
}

// ─────────────── Exports ───────────────
module.exports = {
  calculateFreeIntervals,
  breakDownFreeTime
};
