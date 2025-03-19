// src\Schedule\BlockEditor.jsx

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";

// We'll use your existing API helpers or define new ones
import { updateTimeBlock, callPhoneAlarm, callTaskMagic } from "./scheduleAPI";

function BlockEditor({ block, onClose, onSaved }) {
  // block is { id, startTime, endTime, ... }

  // local state for start/end
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (block) {
      // format ISO -> "HH:mm" for input type="time"
      const startStr = dayjs(block.startTime).format("HH:mm");
      const endStr   = dayjs(block.endTime).format("HH:mm");
      setStart(startStr);
      setEnd(endStr);
    }
  }, [block]);

  console.log("BlockEditor is rendered with block:", block);
  if (!block) return null; // no block => no popup

  async function handleSave() {
    // e.g. convert "HH:mm" => dayjs => ISO
    const date = dayjs(block.startTime).format("YYYY-MM-DD"); // keep same date
    const newStartISO = dayjs(`${date}T${start}`).toISOString();
    const newEndISO   = dayjs(`${date}T${end}`).toISOString();
    
    try {
      const resp = await updateTimeBlock(block._id, newStartISO, newEndISO);
      if (!resp.success) {
        setError(resp.message);
      } else {
        onSaved(); // refetch or update parent state
        onClose(); // close the modal
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  // set phone alarm => calls your new route
  async function handleSetPhoneAlarm() {
    try {
      const resp = await callPhoneAlarm(block._id);
      if (!resp.success) {
        alert("Phone Alarm error: " + resp.message);
      } else {
        alert("Phone Alarm set successfully!");
      }
    } catch (err) {
      console.error(err);
      alert("Network error setting phone alarm");
    }
  }

  // set freedom block => calls your new taskMagic route
  async function handleSetFreedomBlock() {
    try {
      const resp = await callTaskMagic(block._id);
      if (!resp.success) {
        alert("TaskMagic error: " + resp.message);
      } else {
        alert("TaskMagic webhook called!");
      }
    } catch (err) {
      console.error(err);
      alert("Network error calling TaskMagic");
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
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>End Time: </label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          {/* The two manual buttons */}
          <button onClick={handleSetPhoneAlarm}>Set Phone Alarm</button>
          <button onClick={handleSetFreedomBlock}>Set Freedom Block</button>
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={handleSave}>Save</button>
          <button onClick={onClose} style={{ marginLeft: 10 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// simple inline styles
const styles = {
  overlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
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

export default BlockEditor;
