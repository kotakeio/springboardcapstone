// ------------------------------------------------------------------
// Module:    src/Schedule/eventStyle.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Compute CSS style for event blocks in the schedule view.
// ------------------------------------------------------------------

/**
 * @module src/Schedule/eventStyle.js
 * @description
 *   Provides a function to calculate CSS style for positioning and sizing an
 *   event element in a daily schedule grid, based on its start/end ISO timestamps
 *   and approval status.
 */

// ─────────────── Dependencies ───────────────

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  dayStart,
  START_HOUR,
  END_HOUR,
  MINUTES_PER_SLOT,
  ROW_HEIGHT_PX
} from "./scheduleConstants.js";

// Extend dayjs with UTC and timezone support.
dayjs.extend(utc);
dayjs.extend(timezone);

// ─────────────── Public API ───────────────

/**
 * Calculate an absolute-positioned CSS style object for an event.
 *
 * @param {string} startISO - Event start time as an ISO string.
 * @param {string} endISO - Event end time as an ISO string.
 * @param {boolean} [isBlockApproved=false] - Whether the event block is approved.
 * @returns {object} CSS style properties for positioning the event.
 */
export function getEventStyle(startISO, endISO, isBlockApproved = false) {
  // Parse ISO timestamps as UTC then convert to America/Denver timezone.
  const start = dayjs.utc(startISO).tz("America/Denver");
  const end = dayjs.utc(endISO).tz("America/Denver");

  // Clamp events that start before the beginning of the day.
  const effectiveStart = start.isBefore(dayStart) ? dayStart : start;

  // Compute minutes elapsed from the day's start reference.
  const minutesFromDayStart = effectiveStart.diff(dayStart, "minute");

  // Compute total event duration in minutes.
  const duration = end.diff(start, "minute");

  // Translate minutes into pixel values.
  const top = (minutesFromDayStart / MINUTES_PER_SLOT) * ROW_HEIGHT_PX;
  const height = (duration / MINUTES_PER_SLOT) * ROW_HEIGHT_PX;

  // Enforce a minimum visual height.
  const safeHeight = Math.max(height, 10);

  // Select background and border styles based on approval status.
  const bgColor = isBlockApproved
    ? "rgba(0, 200, 255, 0.7)"
    : "rgba(0, 200, 255, 0.2)";
  const borderStyle = isBlockApproved ? "none" : "2px solid cyan";

  return {
    position: "absolute",
    top: `${top}px`,
    left: "100px",
    width: "200px",
    height: `${safeHeight}px`,
    backgroundColor: bgColor,
    border: borderStyle,
    borderRadius: "4px",
    overflow: "hidden",
    padding: "2px 6px",
    boxSizing: "border-box"
  };
}
