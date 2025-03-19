// src/Schedule/scheduleConstants.js
import dayjs from "dayjs";

// You can adjust these as needed
export const START_HOUR = 5;        // 5:00 AM
export const END_HOUR = 22;         // 10:00 PM
export const MINUTES_PER_SLOT = 15;
export const ROW_HEIGHT_PX = 30;

// "dayStart" is the reference moment for the top of the schedule
export const dayStart = dayjs()
  .hour(START_HOUR)
  .minute(0)
  .second(0)
  .millisecond(0);
