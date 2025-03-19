// services/blocks/roundTime.util.js

const dayjs = require("dayjs");

/**
 * Rounds `d` up to the next half-hour boundary.
 * e.g. 13:07 -> 13:30, 13:32 -> 14:00, etc.
 */
function roundToHalfHour(d) {
  const minute = d.minute();
  let newMinute = 0;
  if (minute < 30) {
    newMinute = 30;
  } else {
    newMinute = 60;
  }
  return d.set("minute", newMinute).set("second", 0).set("millisecond", 0);
}

// Round dayjs object to nearest 5-min boundary
function roundToNearest5Min(original) {
    // 1) read the minute
    const minutes = original.minute();
    // 2) find nearest multiple of 5: e.g. 12 => 10, 13 => 15
    const nearest = Math.round(minutes / 5) * 5;
  
    // 3) set that minute and zero out seconds/millis
    return original
      .minute(nearest)
      .second(0)
      .millisecond(0);
  }
  
module.exports = { roundToHalfHour, roundToNearest5Min };
