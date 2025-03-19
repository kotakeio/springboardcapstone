// services/blocks/timeBlocks.util.js

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

//
// 1) Convert busy array -> free intervals
//
function calculateFreeIntervals(now, endTime, busyArray) {
  let freeIntervals = [];
  let lastEnd = now;

  busyArray.forEach((b) => {
    const busyStart = dayjs.utc(b.start).tz("America/Denver");
    const busyEnd = dayjs.utc(b.end).tz("America/Denver");

    if (busyStart.isAfter(lastEnd)) {
      freeIntervals.push({ start: lastEnd, end: busyStart });
    }
    if (busyEnd.isAfter(lastEnd)) {
      lastEnd = busyEnd;
    }
  });

  if (endTime.isAfter(lastEnd)) {
    freeIntervals.push({ start: lastEnd, end: endTime });
  }

  return freeIntervals;
}

//
// 2) Break free intervals into 50/25-min blocks, with special rules:
//    - If pointer starts on :30, do an initial 25-min block so subsequent blocks start on hour.
//    - Standard 50-min blocks + 10-min gap, or 25-min + 5-min gap
//    - If last block ends at 15:20, forcibly add 15:30..15:55 block (if that’s your desired tweak).
//
function breakDownFreeTime(freeIntervals) {
  const blocks = [];

  freeIntervals.forEach((interval) => {
    let pointer = roundToHalfHour(interval.start);

    // If pointer is exactly on :30 for the first block => 25 min, then round up to next hour
    if (pointer.minute() === 30 && pointer.isBefore(interval.end)) {
      const nextPointer = pointer.add(25, "minute");
      if (nextPointer.isBefore(interval.end)) {
        blocks.push({
          start: pointer.format("HH:mm"),
          end: nextPointer.format("HH:mm"),
          length: 25,
        });
        pointer = roundUpToHour(nextPointer);
      }
    }

    // Now proceed with normal block creation
    while (pointer.isBefore(interval.end)) {
      // Attempt 50-min block
      const potential50End = pointer.add(50, "minute");

      if (potential50End.isBefore(interval.end) || potential50End.isSame(interval.end)) {
        blocks.push({
          start: pointer.format("HH:mm"),
          end: potential50End.format("HH:mm"),
          length: 50,
        });
        pointer = potential50End.add(10, "minute"); // 10-min gap
      } else {
        // Try 25-min block
        const potential25End = pointer.add(25, "minute");
        if (potential25End.isBefore(interval.end) || potential25End.isSame(interval.end)) {
          blocks.push({
            start: pointer.format("HH:mm"),
            end: potential25End.format("HH:mm"),
            length: 25,
          });
          pointer = potential25End.add(5, "minute"); // 5-min gap
        } else {
          break; // no room for 25
        }
      }
    }
  });

  // Optional: force an extra 25-min block if last ended at 15:20
  if (blocks.length) {
    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock.end === "15:20") {
      blocks.push({
        start: "15:30",
        end: "15:55",
        length: 25,
      });
    }
  }

  return blocks;
}

//
// 3) Rounds a date/time to the *nearest* half-hour boundary.
//    If minute < 30 => minute=30, else minute=60 (which bumps the hour).
//
function roundToHalfHour(d) {
  const minute = d.minute();
  if (minute < 30) {
    return d.set("minute", 30).set("second", 0).set("millisecond", 0);
  } else {
    // e.g. 13:45 => 14:00
    return d.set("minute", 60).set("second", 0).set("millisecond", 0);
  }
}

//
// 4) Round a date/time up to the *next* whole hour.
//    e.g. if d=07:47 => 08:00, if d=07:03 => 08:00
//
function roundUpToHour(d) {
  return d.set("minute", 60).set("second", 0).set("millisecond", 0);
}

module.exports = {
  calculateFreeIntervals,
  breakDownFreeTime,
};
