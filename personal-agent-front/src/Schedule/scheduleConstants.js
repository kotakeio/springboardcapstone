// ------------------------------------------------------------------
// Module:    src/Schedule/scheduleConstants.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Define schedule time-range, slot granularity, layout metrics,
//            and reference start moment for the Schedule component.
// ------------------------------------------------------------------

/**
 * @module scheduleConstants
 * @description
 *   Contains configuration constants for rendering the daily schedule:
 *     - START_HOUR, END_HOUR define the visible time span (in hours).
 *     - MINUTES_PER_SLOT controls the duration of each row (in minutes).
 *     - ROW_HEIGHT_PX sets the pixel height of each time slot row.
 *     - dayStart is the dayjs reference moment marking the schedule’s top.
 */

// ─────────────── Dependencies ───────────────

import dayjs from "dayjs";

// ─────────────── Constants ───────────────

/**
 * The hour (0–23) at which the schedule begins.
 * Adjust to change the earliest visible time slot.
 */
export const START_HOUR = 0;

/**
 * The hour (1–24) at which the schedule ends.
 * Adjust to change the latest visible time slot.
 */
export const END_HOUR = 24;

/**
 * Duration of each time slot, in minutes.
 * A smaller number yields more granular slots.
 */
export const MINUTES_PER_SLOT = 15;

/**
 * Height of each time slot row, in pixels.
 * Modify for more compact or spacious layouts.
 */
export const ROW_HEIGHT_PX = 30;

// ─────────────── Reference Moment ───────────────

/**
 * A dayjs object representing the start of today’s schedule.
 * Set to START_HOUR:00:00.000 in local time.
 */
export const dayStart = dayjs()
  .hour(START_HOUR)
  .minute(0)
  .second(0)
  .millisecond(0);
