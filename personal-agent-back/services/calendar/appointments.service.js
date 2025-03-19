// services/calendar/appointments.service.js

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const { createCalendarClient } = require("./calendarAuth.service");

/**
 * Query free/busy from now until a specified endTime for a given calendar.
 * Return the 'busy' array from the response.
 */
async function getBusyTimesUntil(calendarIds, endTime) {
    const calendar = createCalendarClient();
    const now = dayjs().tz("America/Denver");
  
    // Prepare multiple items
    const items = calendarIds.map((id) => ({ id }));
  
    const resp = await calendar.freebusy.query({
      requestBody: {
        timeMin: now.toISOString(),
        timeMax: endTime.toISOString(),
        timeZone: "America/Denver",
        items,
      },
    });

    console.log(`Calendar Ids:`, items);

        // Combine busy arrays
    let allBusy = [];
    for (const calId of calendarIds) {
      const busyForCal = resp.data.calendars[calId].busy || [];
      allBusy = [...allBusy, ...busyForCal];
    }
  
    // Sort and merge overlapping intervals in allBusy
    // We'll do that next
    const mergedBusy = mergeBusyIntervals(allBusy);
  
    return {
      now,
      busyArray: mergedBusy, // array of { start, end } covering both calendars
    };
  }
  
  /**
   * Merges overlapping busy intervals into a single sorted array.
   * If one busy block is [10:00 - 11:00] and another is [10:30 - 12:00],
   * combined becomes [10:00 - 12:00].
   */
  function mergeBusyIntervals(busyArr) {
    if (!busyArr.length) return [];
  
    // Convert each {start, end} to a Dayjs for sorting
    let intervals = busyArr.map((b) => ({
      start: dayjs(b.start),
      end: dayjs(b.end),
    }));
  
    // Sort by start time
    intervals.sort((a, b) => a.start.valueOf() - b.start.valueOf());
  
    const merged = [];
    let current = intervals[0];
  
    for (let i = 1; i < intervals.length; i++) {
      const next = intervals[i];
      if (next.start.isBefore(current.end)) {
        // Overlapping
        current.end = dayjs.max(current.end, next.end);
      } else {
        // No overlap, push current
        merged.push(current);
        current = next;
      }
    }
    // push the last one
    merged.push(current);
  
    return merged.map((i) => ({
      start: i.start.toISOString(),
      end: i.end.toISOString(),
    }));
  }
  

/**
 * Example: list appointments (events) in a given time range
 */
async function listAppointments(calendarId = "primary", timeMin, timeMax) {
  const calendar = createCalendarClient();
  console.log(`Min Time:`, timeMin);
  console.log(`Max Time:`, timeMax);

  const res = await calendar.events.list({
    calendarId,
    timeMin: dayjs(timeMin).toISOString(),
    timeMax: dayjs(timeMax).toISOString(),
    timeZone: "America/Denver",  // <--- Specify the timezone here
    singleEvents: true,
    orderBy: "startTime",
  });

  console.log(`Calender Appointments:`, res.data.items);
  // This returns a list of event objects
  return res.data.items; 
}

module.exports = {
  getBusyTimesUntil,
  listAppointments,
};
