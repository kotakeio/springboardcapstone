// services/phoneAlarm.service.js

require('dotenv').config(); // Load environment variables from .env

// If you're on Node < 18, install and import node-fetch:
// const fetch = require("node-fetch");

const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

// Read endpoints from the environment variable and convert to an array
const PHONE_ALARM_ENDPOINTS = process.env.PHONE_ALARM_ENDPOINTS
  ? process.env.PHONE_ALARM_ENDPOINTS.split(',')
  : [];

if (PHONE_ALARM_ENDPOINTS.length === 0) {
  throw new Error("No phone alarm endpoints defined in environment variable PHONE_ALARM_ENDPOINTS");
}

/**
 * Converts 24-hour time "13:00" into "1_00_pm".
 * E.g. "00:30" => "12_30_am"
 *      "12:00" => "12_00_pm"
 *      "13:45" => "1_45_pm"
 *      "00:00" => "12_00_am"
 */
function convert24ToAmPm(time24) {
  // time24 is something like "HH:MM" => e.g. "13:00"
  const [hhStr, mmStr] = time24.split(":");
  let hh = parseInt(hhStr, 10);   // 13
  const mm = mmStr;               // "00"

  let suffix = "am";
  if (hh === 0) {
    // 00:XX => 12:XX am
    hh = 12;
  } else if (hh === 12) {
    // 12:XX => 12:XX pm
    suffix = "pm";
  } else if (hh > 12) {
    // 13 => 1 pm, etc.
    hh = hh - 12;
    suffix = "pm";
  }
  // else it remains "am" if 1..11

  // Format e.g. 1 => "1", mm => "00", suffix => "pm" => "1_00_pm"
  return `${hh}_${mm}_${suffix}`;
}

/**
 * Tries each endpoint in PHONE_ALARM_ENDPOINTS (in order).
 * If any of them returns NOT 503, we consider it "success."
 * If all fail with 503, we throw an error.
 */
async function setPhoneAlarm(time24) {
  const timeAmPm = convert24ToAmPm(time24);
  const requestBody = { time: timeAmPm };

  let lastError = null;

  for (const endpoint of PHONE_ALARM_ENDPOINTS) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (resp.status === 503) {
        // Mark an error but continue to next endpoint
        lastError = new Error(`503 from ${endpoint}`);
        console.warn(`Alarm endpoint 503: ${endpoint}, trying next...`);
        continue;
      }

      if (!resp.ok) {
        // e.g. 4xx or 5xx other than 503
        lastError = new Error(`Failed with status ${resp.status} from ${endpoint}`);
        console.warn(`Alarm endpoint error ${resp.status}: ${endpoint}, trying next...`);
        continue;
      }

      // If we reach here => success
      console.log(`Alarm set successfully at ${endpoint} for ${timeAmPm}`);
      return; // exit function with success
    } catch (err) {
      // If fetch itself fails (network error, etc.)
      lastError = err;
      console.warn(`Error calling ${endpoint}:`, err.message);
      // Move on to next endpoint
    }
  }

  // If we exhausted all endpoints, throw an error back to the caller
  throw new Error(lastError ? lastError.message : "All endpoints failed");
}

module.exports = {
  setPhoneAlarm
};
