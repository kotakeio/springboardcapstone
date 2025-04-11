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
import ProgressBar from "../components/ProgressBar"; // New import

// Helper delay function.
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Spinner style used for the Approve button.
const spinnerStyle = {
  width: "16px",
  height: "16px",
  border: "2px solid #f3f3f3",
  borderTop: "2px solid #00e1ff",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  display: "inline-block",
  marginRight: "0.5rem",
};

function Schedule() {
  const [appointments, setAppointments] = useState([]);
  const [timeBlocks, setTimeBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editBlock, setEditBlock] = useState(null);
  const [isApproving, setIsApproving] = useState(false);

  // Progress bar state, where "Account Created" is always done.
  const [progressSteps, setProgressSteps] = useState([
    { label: "Account Created", done: true },
    { label: "Email Verified", done: false },
    { label: "Calendar Setup", done: false },
  ]);

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
        // Update progress steps based on whether emails are verified and appointments exist
        if (data.verified === false) {
          // If no verified emails, mark second and third step as pending.
          setProgressSteps([
            { label: "Account Created", done: true },
            { label: "Email Verified", done: false },
            { label: "Calendar Setup", done: false },
          ]);
          setError("No verified calendar emails found. Please verify or add an email.");
          setAppointments([]);
          setTimeBlocks([]);
        } else {
          // Email verified; mark step two as done.
          // Also mark "Calendar Setup" as done if there are real appointments (i.e. not a sample).
          setProgressSteps([
            { label: "Account Created", done: true },
            { label: "Email Verified", done: true },
            { label: "Calendar Setup", done: (data.appointments && data.appointments.length > 0) ? true : false },
          ]);
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

  // Approve all unapproved blocks with minimum 3 second delay and loading state.
  async function handleApproveAll() {
    setIsApproving(true);
    const startTime = Date.now();
    try {
      const { data } = await axiosInstance.post("/api/freedom-blocks/approveAll");
      const elapsed = Date.now() - startTime;
      if (elapsed < 3000) {
        await delay(3000 - elapsed);
      }
      if (!data.success) {
        alert("Error approving blocks: " + data.message);
      } else {
        loadData(); // refresh schedule data
      }
    } catch (err) {
      alert("Network error approving blocks");
      console.error(err);
    } finally {
      setIsApproving(false);
    }
  }

  if (loading) return <div>Loading schedule...</div>;

  // If there's an error, still show the CalendarEmailManager so the user can verify
  if (error) {
    return (
      <div style={{ color: "red" }}>
        <p>{error}</p>
        <CalendarEmailManager onCalendarUpdate={loadData} />
      </div>
    );
  }

  // Build the day column grid lines.
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

      {/* Progress Bar shown at the top until all steps are done */}
      <ProgressBar steps={progressSteps} />

      {/* Calendar Email Manager always shown; pass down a callback for re-fetching */}
      <CalendarEmailManager onCalendarUpdate={loadData} />

      {/* Approve All Blocks button, showing a spinner when in loading state */}
      {timeBlocks.some((b) => !b.approved) && (
        <button onClick={handleApproveAll} disabled={isApproving}>
          {isApproving ? (
            <>
              <div style={spinnerStyle} />
              Approving Blocks...
            </>
          ) : (
            "Approve All Blocks"
          )}
        </button>
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
      {/* Inline keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Schedule;
