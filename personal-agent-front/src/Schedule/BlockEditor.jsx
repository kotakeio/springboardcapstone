// src/Schedule/BlockEditor.jsx

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";

// Import your API helpers
import { updateTimeBlock, callPhoneAlarm, callTaskMagic } from "./scheduleAPI";

// Helper delay function that returns a promise resolving after ms milliseconds.
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function BlockEditor({ block, onClose, onSaved }) {
  // Local state for start/end time inputs and error
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");

  // New loading states for each button
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingPhoneAlarm, setIsSettingPhoneAlarm] = useState(false);
  const [isSettingFreedomBlock, setIsSettingFreedomBlock] = useState(false);

  useEffect(() => {
    if (block) {
      // Format ISO to "HH:mm" for input type="time"
      const startStr = dayjs(block.startTime).format("HH:mm");
      const endStr = dayjs(block.endTime).format("HH:mm");
      setStart(startStr);
      setEnd(endStr);
    }
  }, [block]);

  if (!block) return null; // No block => no popup

  // ----------------------------
  // Handle Save (Update) with delay and loading state
  // ----------------------------
  async function handleSave() {
    const date = dayjs(block.startTime).format("YYYY-MM-DD"); // keep same date
    const newStartISO = dayjs(`${date}T${start}`).toISOString();
    const newEndISO = dayjs(`${date}T${end}`).toISOString();
    
    setIsSaving(true);
    setError("");
    const startTimeStamp = Date.now();
    try {
      const resp = await updateTimeBlock(block._id, newStartISO, newEndISO);
      const elapsed = Date.now() - startTimeStamp;
      if (elapsed < 3000) {
        await delay(3000 - elapsed);
      }
      if (!resp.success) {
        setError(resp.message);
      } else {
        onSaved(); // Update parent state
        onClose(); // Close modal
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // ----------------------------
  // Handle Set Phone Alarm with delay and loading state
  // ----------------------------
  async function handleSetPhoneAlarm() {
    setIsSettingPhoneAlarm(true);
    const startTimeStamp = Date.now();
    try {
      const resp = await callPhoneAlarm(block._id);
      const elapsed = Date.now() - startTimeStamp;
      if (elapsed < 3000) {
        await delay(3000 - elapsed);
      }
      if (!resp.success) {
        alert("Phone Alarm error: " + resp.message);
      } else {
        alert("Phone Alarm set successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Network error setting phone alarm");
    } finally {
      setIsSettingPhoneAlarm(false);
    }
  }

  // ----------------------------
  // Handle Set Freedom Block with delay and loading state
  // ----------------------------
  async function handleSetFreedomBlock() {
    setIsSettingFreedomBlock(true);
    const startTimeStamp = Date.now();
    try {
      const resp = await callTaskMagic(block._id);
      const elapsed = Date.now() - startTimeStamp;
      if (elapsed < 3000) {
        await delay(3000 - elapsed);
      }
      if (!resp.success) {
        alert("TaskMagic error: " + resp.message);
      } else {
        alert("TaskMagic webhook called!");
      }
    } catch (err) {
      console.error(err);
      alert("Network error calling TaskMagic");
    } finally {
      setIsSettingFreedomBlock(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Edit Time Block</h3>
        {error && <div style={{ color: "red" }}>{error}</div>}

        {/* Start/End time fields */}
        <div>
          <label>Start Time: </label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>End Time: </label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          {/* Manual action buttons */}
          <button
            onClick={handleSetPhoneAlarm}
            disabled={isSettingPhoneAlarm || isSaving}
          >
            {isSettingPhoneAlarm ? (
              <>
                <div style={spinnerStyle} />
                Setting Phone Alarm...
              </>
            ) : (
              "Set Phone Alarm"
            )}
          </button>
          <button
            onClick={handleSetFreedomBlock}
            disabled={isSettingFreedomBlock || isSaving}
            style={{ marginLeft: 10 }}
          >
            {isSettingFreedomBlock ? (
              <>
                <div style={spinnerStyle} />
                Setting Freedom Block...
              </>
            ) : (
              "Set Freedom Block"
            )}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <div style={spinnerStyle} />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
          <button onClick={onClose} style={{ marginLeft: 10 }} disabled={isSaving}>
            Cancel
          </button>
        </div>
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

// Simple inline styles for overlay and modal
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modal: {
    backgroundColor: "#242424",
    padding: "3rem",
    borderRadius: "8px",
    minWidth: "300px",
  },
};

// Spinner style used for all buttons
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

export default BlockEditor;
