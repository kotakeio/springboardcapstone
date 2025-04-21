// ------------------------------------------------------------------
// Module:    services/blocks/roundTime.util.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Utilities for rounding dayjs date objects to time boundaries.
// ------------------------------------------------------------------

/**
 * @module services/blocks/roundTime.util
 * @description
 *   Provides functions to round Day.js objects:
 *     - roundToHalfHour: up to the next :00 or :30 boundary
 *     - roundToNearest5Min: to the closest 5‑minute mark
 */

// ─────── Dependencies ───────
const dayjs = require("dayjs");

// ─────── Utility Functions ───────

/**
 * Round a Day.js object up to the next half‑hour boundary.
 *
 * @param {dayjs.Dayjs} d
 *   The Day.js object to be rounded.
 * @returns {dayjs.Dayjs}
 *   A new Day.js instance snapped to the next :00 or :30, 
 *   with seconds and milliseconds zeroed.
 */
function roundToHalfHour(d) {
  // determine current minute within the hour
  const minute = d.minute();

  // decide whether to round up to :30 or roll over to the next hour (:60)
  const newMinute = minute < 30 ? 30 : 60;

  // apply the new minute and clear smaller units
  return d
    .set("minute", newMinute)
    .set("second", 0)
    .set("millisecond", 0);
}

/**
 * Round a Day.js object to the nearest 5‑minute increment.
 *
 * @param {dayjs.Dayjs} original
 *   The Day.js object to be rounded.
 * @returns {dayjs.Dayjs}
 *   A new Day.js instance snapped to the closest multiple of 5 minutes,
 *   with seconds and milliseconds zeroed.
 */
function roundToNearest5Min(original) {
  // extract the current minute component
  const minutes = original.minute();

  // compute the nearest multiple of 5 (e.g., 12→10, 13→15)
  const nearest = Math.round(minutes / 5) * 5;

  // set the snapped minute and clear seconds/milliseconds
  return original
    .minute(nearest)
    .second(0)
    .millisecond(0);
}

// ─────── Exports ───────
module.exports = {
  roundToHalfHour,
  roundToNearest5Min
};
