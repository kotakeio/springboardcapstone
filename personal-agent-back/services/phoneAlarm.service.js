// ------------------------------------------------------------------
// Module:    services/phoneAlarm.service.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Service to set phone alarms via HTTP endpoints.
// ------------------------------------------------------------------

/**
 * @module PhoneAlarmService
 * @description
 *   - Reads alarm endpoints from PHONE_ALARM_ENDPOINTS env variable.
 *   - Converts 24-hour times into API-specific format.
 *   - Tries each endpoint until one succeeds or throws on failure.
 */

// ─────────────── Dependencies ───────────────

require('dotenv').config(); // Load environment variables from .env

// Use native fetch if available, or fallback to node-fetch
const fetch =
  global.fetch ||
  ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

const PHONE_ALARM_ENDPOINTS = process.env.PHONE_ALARM_ENDPOINTS
  ? process.env.PHONE_ALARM_ENDPOINTS.split(',')
  : [];

if (PHONE_ALARM_ENDPOINTS.length === 0) {
  throw new Error(
    'No phone alarm endpoints defined in environment variable PHONE_ALARM_ENDPOINTS'
  );
}

// ─────────────── Utility Functions ───────────────

/**
 * Convert 24-hour time string "HH:MM" to "h_MM_am" or "h_MM_pm".
 *
 * @param {string} time24  Time in "HH:MM" 24-hour format.
 * @returns {string}       Formatted time string for the alarm API.
 */
function convert24ToAmPm(time24) {
  const [hhStr, mm] = time24.split(':');
  let hh = parseInt(hhStr, 10);
  let suffix = 'am';

  if (hh === 0) {
    hh = 12; // 00:XX => 12:XX am
  } else if (hh === 12) {
    suffix = 'pm'; // 12:XX => 12:XX pm
  } else if (hh > 12) {
    hh -= 12;
    suffix = 'pm'; // 13..23 => 1..11 pm
  }

  return `${hh}_${mm}_${suffix}`;
}

// ─────────────── Service Function ───────────────

/**
 * Attempt to set a phone alarm by POSTing to configured endpoints.
 *
 * @param {string} time24       Time in "HH:MM" 24-hour format.
 * @returns {Promise<void>}     Resolves on the first successful request.
 * @throws {Error}              If all endpoints fail or return status 503.
 */
async function setPhoneAlarm(time24) {
  const timeAmPm = convert24ToAmPm(time24);
  const requestBody = { time: timeAmPm };
  let lastError = null;

  for (const endpoint of PHONE_ALARM_ENDPOINTS) {
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (resp.status === 503) {
        // Service unavailable at this endpoint; try next
        lastError = new Error(`503 from ${endpoint}`);
        console.warn(
          `Alarm endpoint returned 503: ${endpoint}. Trying next endpoint.`
        );
        continue;
      }

      if (!resp.ok) {
        // Non-503 error (e.g., 4xx or other 5xx); record and try next
        lastError = new Error(`Status ${resp.status} from ${endpoint}`);
        console.warn(
          `Alarm endpoint error ${resp.status}: ${endpoint}. Trying next endpoint.`
        );
        continue;
      }

      // Success: exit function
      return;
    } catch (err) {
      // Network or fetch error; record and try next
      lastError = err;
      console.warn(`Error calling ${endpoint}: ${err.message}`);
    }
  }

  // All endpoints failed: propagate the last error
  throw new Error(
    lastError ? lastError.message : 'All phone alarm endpoints failed.'
  );
}

// ─────────────── Exports ───────────────

module.exports = {
  setPhoneAlarm,
};
