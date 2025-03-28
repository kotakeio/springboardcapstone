// src/Schedule/Schedule.jsx
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { fetchTodaySchedule } from "./scheduleAPI.js";
import { getEventStyle } from "./eventStyle.js";
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
import CalendarEmailManager from "../CalendarEmailManager";

function Schedule() {
  const [appointments, setAppointments] = useState([]);
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editBlock, setEditBlock] = useState(null);

  // ----------------------------
  //  Fetch the schedule data
  // ----------------------------
  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const data = await fetchTodaySchedule();
      console.log("Schedule data from backend:", data);

      if (data.success) {
        // If no verified emails
        if (data.verified === false) {
          setError("No verified calendar emails found. Please verify or add an email.");
          setAppointments([]);
          setTimeBlocks([]);
        } else {
          setAppointments(data.appointments || []);
          setTimeBlocks(data.timeBlocks || []);
        }
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

  // Load data on mount
  useEffect(() => {
    console.log("Schedule component mounted. Loading data...");
    loadData();
  }, []);

  function handleEditBlock(block) {
    setEditBlock(block);
  }

  // Approve all unapproved blocks
  async function handleApproveAll() {
    try {
      const { data } = await axiosInstance.post("/api/freedom-blocks/approveAll");
      if (!data.success) {
        alert("Error approving blocks: " + data.message);
      } else {
        loadData(); // refresh
      }
    } catch (err) {
      alert("Network error approving blocks");
      console.error(err);
    }
  }

  if (loading) return <div>Loading schedule...</div>;

  // If there's an error, we still show the CalendarEmailManager so the user can verify
  if (error) {
    return (
      <div style={{ color: "red" }}>
        <p>{error}</p>
        <CalendarEmailManager 
          onCalendarUpdate={loadData} // <--- pass the prop here
        />
      </div>
    );
  }

  // Build the day column grid lines
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

  return (
    <div className="schedule-container">
      <h2>Today's Schedule</h2>

      {/* Email Manager always shown; pass down a callback for re-fetching */}
      <CalendarEmailManager onCalendarUpdate={loadData} />

      {/* Show Approve button if unapproved blocks exist */}
      {timeBlocks.some((b) => !b.approved) && (
        <button onClick={handleApproveAll}>Approve All Blocks</button>
      )}

      <hr className="day-column-divider" />

      <div className="day-column-outer">
        <div className="day-column-inner" style={{ height: containerHeight }}>
          {gridLines.map((line, idx) => (
            <div key={idx} className="schedule-grid-line" style={{ top: line.top }}>
              <span className="schedule-grid-line-label">{line.label}</span>
            </div>
          ))}

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
