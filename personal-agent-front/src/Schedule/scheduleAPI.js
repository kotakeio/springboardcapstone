// ------------------------------------------------------------------
// Module:    src/Schedule/scheduleAPI.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Client API for fetching and managing freedom-blocks schedule.
// ------------------------------------------------------------------

/**
 * @module src/Schedule/scheduleAPI
 * @description
 *   Provides functions to:
 *     - Fetch today's schedule (appointments + time blocks).
 *     - Update, delete, and trigger alarms or TaskMagic for time blocks.
 */

// ───── Dependencies ─────────────────────────────────────────────────────────

import axiosInstance from "../axiosInstance";

// ───── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch today's appointments and time blocks from the backend.
 *
 * @async
 * @function fetchTodaySchedule
 * @returns {Promise<Object>} The response data containing appointments and blocks.
 * @throws {Error}           If the HTTP request fails with a status code or message.
 */
export async function fetchTodaySchedule() {
  try {
    const { data } = await axiosInstance.get("/api/freedom-blocks/today");
    return data;
  } catch (error) {
    // Throw a standardized error message including HTTP status or original error
    throw new Error(`HTTP error: ${error.response?.status || error.message}`);
  }
}

/**
 * Update a specific time block by ID.
 *
 * @async
 * @function updateTimeBlock
 * @param {string} id          The ID of the time block to update.
 * @param {string} startTime   ISO string for the new start time.
 * @param {string} endTime     ISO string for the new end time.
 * @returns {Promise<Object>}  The updated time block data.
 */
export async function updateTimeBlock(id, startTime, endTime) {
  const { data } = await axiosInstance.put(
    `/api/freedom-blocks/${id}`,
    { startTime, endTime }
  );
  return data;
}

/**
 * Delete a time block by ID.
 *
 * @async
 * @function deleteTimeBlock
 * @param {string} id         The ID of the time block to delete.
 * @returns {Promise<Object>} The response data confirming deletion.
 */
export async function deleteTimeBlock(id) {
  const { data } = await axiosInstance.delete(`/api/freedom-blocks/${id}`);
  return data;
}

/**
 * Trigger a phone alarm for a given block.
 *
 * @async
 * @function callPhoneAlarm
 * @param {string} blockId    The ID of the time block for which to set the phone alarm.
 * @returns {Promise<Object>} The response data from the phone alarm endpoint.
 */
export async function callPhoneAlarm(blockId) {
  const { data } = await axiosInstance.post(
    `/api/freedom-blocks/${blockId}/phoneAlarm`
  );
  return data;
}

/**
 * Trigger TaskMagic for a given block.
 *
 * @async
 * @function callTaskMagic
 * @param {string} blockId    The ID of the time block for which to call TaskMagic.
 * @returns {Promise<Object>} The response data from the TaskMagic endpoint.
 */
export async function callTaskMagic(blockId) {
  const { data } = await axiosInstance.post(
    `/api/freedom-blocks/${blockId}/taskMagic`
  );
  return data;
}
