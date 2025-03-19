// src/Schedule/scheduleAPI.js
import axiosInstance from "../axiosInstance";

/**
 * Fetch today's appointments and timeBlocks from the backend.
 */
export async function fetchTodaySchedule() {
  try {
    const { data } = await axiosInstance.get("/api/freedom-blocks/today");
    return data;
  } catch (error) {
    throw new Error(`HTTP error: ${error.response?.status || error.message}`);
  }
}

export async function updateTimeBlock(id, startTime, endTime) {
  const { data } = await axiosInstance.put(`/api/freedom-blocks/${id}`, {
    startTime,
    endTime,
  });
  return data;
}

export async function deleteTimeBlock(id) {
  const { data } = await axiosInstance.delete(`/api/freedom-blocks/${id}`);
  return data;
}

export async function callPhoneAlarm(blockId) {
  const { data } = await axiosInstance.post(
    `/api/freedom-blocks/${blockId}/phoneAlarm`
  );
  return data;
}

export async function callTaskMagic(blockId) {
  const { data } = await axiosInstance.post(
    `/api/freedom-blocks/${blockId}/taskMagic`
  );
  return data;
}
