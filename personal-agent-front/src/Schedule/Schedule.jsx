// src/Schedule/Schedule.jsx
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { fetchTodaySchedule } from "./scheduleAPI.js";
import { getEventStyle } from "./eventStyle.js"; // for appointments
import {
  dayStart,
  START_HOUR,
  END_HOUR,
  MINUTES_PER_SLOT,
  ROW_HEIGHT_PX,
} from "./scheduleConstants.js";
import "./Schedule.css";
import TimeBlock from "./TimeBlock.jsx";
import BlockEditor from "./BlockEditor";
import axiosInstance from "../axiosInstance";

function Schedule() {
  const [appointments, setAppointments] = useState([]);
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editBlock, setEditBlock] = useState(null);

  function handleEditBlock(block) {
    setEditBlock(block);
  }

  // Function to "refetch" schedule data after updates
  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const data = await fetchTodaySchedule();
      console.log("Schedule data from backend:", data); // <-- Add this
      if (data.success) {
        setAppointments(data.appointments || []);
        setTimeBlocks(data.timeBlocks || []);
      } else {
        setError(data.message || "Failed to load schedule.");
      }
    } catch (err) {
      console.error("Error loading schedule:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    console.log("Schedule component mounted. Loading data...");
    loadData();
  }, []);

  if (loading) return <div>Loading schedule...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  // Build the day column grid lines...
  const totalMinutes = (END_HOUR - START_HOUR) * 60;
  const totalSlots = totalMinutes / MINUTES_PER_SLOT;
  const containerHeight = totalSlots * ROW_HEIGHT_PX;

  const gridLines = [];
  let current = dayStart;
  for (let i = 0; i <= totalSlots; i++) {
    const label = current.format("h:mm A");
    gridLines.push({ top: i * ROW_HEIGHT_PX, label });
    current = current.add(MINUTES_PER_SLOT, "minute");
  }

  // Approve button: calls the /approveAll route using Axios
  async function handleApproveAll() {
    try {
      const { data } = await axiosInstance.post("/api/freedom-blocks/approveAll");
      if (!data.success) {
        alert("Error approving blocks: " + data.message);
      } else {
        // triggers phone alarms or TaskMagic on server side, then refetch
        loadData();
      }
    } catch (err) {
      alert("Network error approving blocks");
      console.error(err);
    }
  }
  console.log("Schedule: top-level log");

  return (
    <div className="schedule-container">
      <h2>Today's Schedule</h2>

      {/* Approve button (only if we have unapproved blocks) */}
      {timeBlocks.some((b) => !b.approved) && (
        <button onClick={handleApproveAll}>Approve All Blocks</button>
      )}

      <hr className="day-column-divider" />

      {/* Day column */}
      <div className="day-column-outer">
        {/* Inner wrapper sized to "containerHeight" */}
        <div className="day-column-inner" style={{ height: containerHeight }}>
          {/* Grid lines */}
          {gridLines.map((line, idx) => (
            <div key={idx} className="schedule-grid-line" style={{ top: line.top }}>
              <span className="schedule-grid-line-label">{line.label}</span>
            </div>
          ))}

          {/* Appointments (visual only, not draggable) */}
          {appointments.map((appt, idx) => {
            const style = getEventStyle(appt.start?.dateTime, appt.end?.dateTime, true);
            return (
              <div
                key={idx}
                style={{
                  ...style,
                  backgroundColor: "rgba(255, 150, 150, 0.7)",
                  border: "1px solid rgba(255,100,100,0.7)",
                }}
              >
                <strong>{appt.summary || "Appointment"}</strong>
              </div>
            );
          })}

          {/* Draggable Time Blocks */}
          {timeBlocks.map((block) => (
            <TimeBlock
              key={block._id}
              block={block}
              onUpdate={loadData}
              onEdit={handleEditBlock}
            />
          ))}
        </div>

        {editBlock && (
          <BlockEditor
            block={editBlock}
            onClose={() => setEditBlock(null)}
            onSaved={loadData}
          />
        )}
      </div>
    </div>
  );
}

export default Schedule;
