// src/Schedule/eventStyle.js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  dayStart,
  START_HOUR,
  END_HOUR,
  MINUTES_PER_SLOT,
  ROW_HEIGHT_PX,
} from "./scheduleConstants.js";


dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Given an event's start/end times (ISO strings) and whether it's approved,
 * return a style object for absolute positioning within the day column.
 */
export function getEventStyle(startISO, endISO, isBlockApproved = false) {
  // Explicitly parse the ISO strings as UTC, then convert to America/Denver
  const start = dayjs.utc(startISO).tz("America/Denver");
  const end = dayjs.utc(endISO).tz("America/Denver");

  // If the event starts before our day reference, clamp it
  const effectiveStart = start.isBefore(dayStart) ? dayStart : start;

  // minutes from dayStart
  const minutesFromDayStart = effectiveStart.diff(dayStart, "minute");
  // total duration in minutes
  const duration = end.diff(start, "minute");

  // Convert to px
  const top = (minutesFromDayStart / MINUTES_PER_SLOT) * ROW_HEIGHT_PX;
  const height = (duration / MINUTES_PER_SLOT) * ROW_HEIGHT_PX;
  const safeHeight = Math.max(height, 10); // minimum 10px tall

  // Use different styling for approved vs. unapproved events
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
    boxSizing: "border-box",
  };
}