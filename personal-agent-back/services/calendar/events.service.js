// services/calendar/events.service.js

const dayjs = require("dayjs");
const { createCalendarClient } = require("./calendarAuth.service");

/**
 * Create an event on the specified calendar.
 */
async function createEvent(calendarId, summary, start, end) {
  const calendar = createCalendarClient();
  const eventData = {
    summary: summary || "Freedom Block",
    start: {
      dateTime: dayjs(start).toISOString(),
      timeZone: "America/Denver",
    },
    end: {
      dateTime: dayjs(end).toISOString(),
      timeZone: "America/Denver",
    },
  };

  const res = await calendar.events.insert({
    calendarId,
    requestBody: eventData,
  });
  return res.data; // the newly created event
}

/**
 * Delete an event by ID
 */
async function deleteEvent(calendarId, eventId) {
  const calendar = createCalendarClient();
  await calendar.events.delete({
    calendarId,
    eventId,
  });
  return true;
}

module.exports = {
  createEvent,
  deleteEvent,
};
