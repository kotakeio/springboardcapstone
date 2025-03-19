// services/calendar/calendarAuth.service.js

const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

function createCalendarClient() {
  // 1) Load service account JSON
  //    Make sure this is in your .gitignore if it's an actual file
  const keyPath = path.join(__dirname, "../../config/service-account.json");
  const key = JSON.parse(fs.readFileSync(keyPath, "utf-8"));

  // 2) Create JWT auth
  const scopes = ["https://www.googleapis.com/auth/calendar"];
  const jwt = new google.auth.JWT(
    key.client_email,
    null,
    key.private_key,
    scopes
  );

  // 3) Return the calendar client
  return google.calendar({ version: "v3", auth: jwt });
}

module.exports = { createCalendarClient };
