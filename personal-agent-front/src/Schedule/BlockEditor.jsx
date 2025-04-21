// ------------------------------------------------------------------
// Module:    BlockEditor.jsx
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   UI component for editing a single time block: update times,
//            set phone alarms, and trigger TaskMagic actions.
// ------------------------------------------------------------------

/**
 * @module BlockEditor
 * @description
 *   - Renders a modal for editing a freedom time block.
 *   - Allows users to save updated start/end times.
 *   - Provides actions for setting phone alarms and calling TaskMagic.
 */

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";

// ─────────────── API Helpers ───────────────
import { updateTimeBlock, callPhoneAlarm, callTaskMagic } from "./scheduleAPI";

// ─────────────── Utility Functions ───────────────
/**
 * Delay execution for a given duration.
 *
 * @param {number} ms  Milliseconds to pause.
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─────────────── BlockEditor Component ───────────────
/**
 * Edit and manage a single time block.
 *
 * @param {Object} props
 * @param {Object} props.block      Block data containing startTime, endTime, and _id.
 * @param {function} props.onClose  Callback when modal is closed.
 * @param {function} props.onSaved  Callback when changes are saved.
 * @returns {JSX.Element|null}
 */
function BlockEditor({ block, onClose, onSaved }) {
  // Local state for form inputs and error feedback
  const [start, setStart] = useState("");
  const [end, setEnd]     = useState("");
  const [error, setError] = useState("");

  // Loading states for each async action
  const [isSaving, setIsSaving]                   = useState(false);
  const [isSettingPhoneAlarm, setIsSettingPhoneAlarm]     = useState(false);
  const [isSettingFreedomBlock, setIsSettingFreedomBlock] = useState(false);

  // ─────── Initialize form fields when block changes ───────
  useEffect(() => {
    if (block) {
      const fmtStart = dayjs(block.startTime).format("HH:mm");
      const fmtEnd   = dayjs(block.endTime).format("HH:mm");
      setStart(fmtStart);
      setEnd(fmtEnd);
    }
  }, [block]);

  // Do not render modal if no block provided
  if (!block) return null;

  // ─────────────── Handle Save ───────────────
  /**
   * Persist updated start/end times to server, enforcing a minimum
   * 3s delay for UX consistency.
   */
  async function handleSave() {
    const date = dayjs(block.startTime).format("YYYY-MM-DD");
    const newStartISO = dayjs(`${date}T${start}`).toISOString();
    const newEndISO   = dayjs(`${date}T${end}`).toISOString();

    setIsSaving(true);
    setError("");
    const t0 = Date.now();
    try {
      const resp = await updateTimeBlock(block._id, newStartISO, newEndISO);
      const elapsed = Date.now() - t0;
      if (elapsed < 3000) await delay(3000 - elapsed); // ensure 3s minimum

      if (!resp.success) {
        setError(resp.message);
      } else {
        onSaved();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // ─────────────── Handle Phone Alarm ───────────────
  /**
   * Trigger phone alarm via API, enforcing 3s UX delay.
   */
  async function handleSetPhoneAlarm() {
    setIsSettingPhoneAlarm(true);
    const t0 = Date.now();
    try {
      const resp = await callPhoneAlarm(block._id);
      const elapsed = Date.now() - t0;
      if (elapsed < 3000) await delay(3000 - elapsed);

      if (!resp.success) {
        alert(`Phone Alarm error: ${resp.message}`);
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

  // ─────────────── Handle Freedom Block ───────────────
  /**
   * Invoke TaskMagic webhook via API, enforcing 3s UX delay.
   */
  async function handleSetFreedomBlock() {
    setIsSettingFreedomBlock(true);
    const t0 = Date.now();
    try {
      const resp = await callTaskMagic(block._id);
      const elapsed = Date.now() - t0;
      if (elapsed < 3000) await delay(3000 - elapsed);

      if (!resp.success) {
        alert(`TaskMagic error: ${resp.message}`);
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

  // ─────────────── Render ───────────────
  return (
    <div style={styles.overlay} data-tour="blockeditor-modal">
      <div style={styles.modal}>
        <h3>Edit Time Block</h3>
        {error && <div style={{ color: "red" }}>{error}</div>}

        {/* Time inputs */}
        <div>
          <label>Start Time: </label>
          <input
            data-tour="blockeditor-start"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            disabled={isSaving}
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>End Time: </label>
          <input
            data-tour="blockeditor-end"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            disabled={isSaving}
          />
        </div>

        {/* Action buttons */}
        <div style={{ marginTop: 10 }}>
          <button
            data-tour="blockeditor-phone-alarm"
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
            data-tour="blockeditor-freedom-block"
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

        {/* Save/Cancel buttons */}
        <div style={{ marginTop: 10 }}>
          <button
            data-tour="blockeditor-save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div style={spinnerStyle} />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
          <button
            data-tour="blockeditor-cancel"
            onClick={onClose}
            style={{ marginLeft: 10 }}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Inline spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─────────────── Styles ───────────────
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

// ─────────────── Spinner Style ───────────────
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
