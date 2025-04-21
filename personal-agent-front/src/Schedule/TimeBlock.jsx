// ------------------------------------------------------------------
// Module:    TimeBlock.jsx
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   A draggable, resizable time block component for the schedule UI.
// ------------------------------------------------------------------

/**
 * @module TimeBlock
 * @description
 *   - Renders a calendar time block that can be dragged & resized on a 5‑minute grid.
 *   - Persists updates and deletions via scheduleAPI.
 *   - Includes guided‑tour attributes for drag, resize, edit, and delete steps.
 */

// ───────────── Dependencies ─────────────

import React, { useState } from "react";
import { Rnd } from "react-rnd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { updateTimeBlock, deleteTimeBlock } from "./scheduleAPI";
import {
  dayStart,
  MINUTES_PER_SLOT,
  ROW_HEIGHT_PX,
} from "./scheduleConstants.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// ──────────── Utility Functions ────────────

/**
 * Snap a raw minute value to the nearest 5‑minute increment.
 * Ensures all blocks align on 5‑minute boundaries.
 *
 * @param {number} rawMinutes
 * @returns {number}
 */
function snapTo5MinOffset(rawMinutes) {
  return Math.round(rawMinutes / 5) * 5;
}

// ──────────── Component: TimeBlock ────────────

/**
 * TimeBlock renders a single calendar block that can be dragged,
 * resized, edited, or deleted.
 *
 * @param {Object} props
 * @param {{ startTime: string, endTime: string, approved: boolean, _id: string }} props.block
 * @param {() => void} props.onUpdate   Callback after successful update/delete
 * @param {(block: Object) => void} props.onEdit   Callback to open edit mode
 */
function TimeBlock({ block, onUpdate, onEdit }) {
  // ─────────── Initialization ───────────
  // Convert ISO strings into local dayjs instances for Denver timezone.
  const start = dayjs.utc(block.startTime).tz("America/Denver");
  const end   = dayjs.utc(block.endTime).tz("America/Denver");

  // Clamp start at dayStart to avoid negative offsets before grid positioning.
  const effectiveStart     = start.isBefore(dayStart) ? dayStart : start;
  const minutesFromDayStart = effectiveStart.diff(dayStart, "minute");
  const durationMinutes     = end.diff(start, "minute");

  const topPx    = (minutesFromDayStart / MINUTES_PER_SLOT) * ROW_HEIGHT_PX;
  const heightPx = Math.max((durationMinutes / MINUTES_PER_SLOT) * ROW_HEIGHT_PX, 10);

  // ───────────── State & Styles ─────────────
  // Manage drag/resize position and display hover label.
  const [position, setPosition] = useState({ x: 100, y: topPx });
  const [size,     setSize]     = useState({ width: 275, height: heightPx });
  const [hoverTime, setHoverTime] = useState("");

  // Visual style varies based on approval status.
  const bgColor = block.approved
    ? "rgba(0, 200, 255, 0.7)"
    : "rgba(0, 200, 255, 0.2)";
  const border = block.approved ? "none" : "2px solid cyan";

  const blockLabel = `${start.format("h:mm A")} - ${end.format("h:mm A")}`;

  // ─────────── Helper: Grid Alignment ───────────

  /**
   * Convert a Y‑pixel value into a snapped dayjs start time.
   * Aligns to the 5‑minute grid relative to dayStart.
   *
   * @param {number} yPx
   * @returns {dayjs.Dayjs}
   */
  function getSnappedStartTime(yPx) {
    const rawMinutes = (yPx / ROW_HEIGHT_PX) * MINUTES_PER_SLOT;
    const snapped    = snapTo5MinOffset(rawMinutes);
    return dayStart.add(snapped, "minute");
  }

  // ─────────── Handlers: Drag ───────────

  function handleDrag(e, d) {
    // Show live preview of new time range during drag.
    const newStart    = getSnappedStartTime(d.y);
    const oldDuration = end.diff(start, "minute");
    const newEnd      = newStart.add(oldDuration, "minute");
    setHoverTime(`${newStart.format("h:mm A")} - ${newEnd.format("h:mm A")}`);
  }

  async function handleDragStop(e, d) {
    const newStart    = getSnappedStartTime(d.y);
    const oldDuration = end.diff(start, "minute");
    const newEnd      = newStart.add(oldDuration, "minute");

    try {
      const resp = await updateTimeBlock(
        block._id,
        newStart.toISOString(),
        newEnd.toISOString()
      );
      if (!resp.success) {
        alert("Error: " + resp.message);
        setPosition({ x: 100, y: topPx });  // revert on failure
      } else {
        onUpdate();  // notify parent to refresh
      }
    } catch {
      setPosition({ x: 100, y: topPx });  // revert on exception
    } finally {
      setHoverTime("");
    }
  }

  // ─────────── Handlers: Resize ───────────

  function handleResize(e, direction, ref, delta, pos) {
    // Show live preview of new time range during resize.
    const newHeightPx  = parseFloat(ref.style.height);
    const newStart     = getSnappedStartTime(pos.y);
    const rawDuration  = (newHeightPx / ROW_HEIGHT_PX) * MINUTES_PER_SLOT;
    const snappedDur   = snapTo5MinOffset(rawDuration);
    const newEnd       = newStart.add(snappedDur, "minute");
    setHoverTime(`${newStart.format("h:mm A")} - ${newEnd.format("h:mm A")}`);
  }

  async function handleResizeStop(e, direction, ref, delta, pos) {
    const newHeightPx  = parseFloat(ref.style.height);
    const newStart     = getSnappedStartTime(pos.y);
    const rawDuration  = (newHeightPx / ROW_HEIGHT_PX) * MINUTES_PER_SLOT;
    const snappedDur   = snapTo5MinOffset(rawDuration);
    const newEnd       = newStart.add(snappedDur, "minute");

    try {
      const resp = await updateTimeBlock(
        block._id,
        newStart.toISOString(),
        newEnd.toISOString()
      );
      if (!resp.success) {
        alert("Error: " + resp.message);
        setPosition({ x: 100, y: topPx });
        setSize({ width: 275, height: heightPx });
      } else {
        onUpdate();
      }
    } catch {
      setPosition({ x: 100, y: topPx });
      setSize({ width: 275, height: heightPx });
    } finally {
      setHoverTime("");
    }
  }

  // ─────────── Handler: Delete ───────────

  async function handleDelete(e) {
    e.stopPropagation();  // prevent drag during delete click
    if (!window.confirm("Delete this block?")) return;

    try {
      const resp = await deleteTimeBlock(block._id);
      if (!resp.success) {
        alert("Error deleting block: " + resp.message);
      } else {
        onUpdate();
      }
    } catch {
      alert("Network error deleting block");
    }
  }

  // ──────────── Render ────────────

  return (
    <>
      <Rnd
        resizeHandleComponent={{
          bottom: (
            <div
              data-tour="resize-timeblock"
              style={{
                width: "100%",
                height: "10px",
                position: "absolute",
                bottom: 0,
                cursor: "ns-resize"
              }}
            />
          )
        }}
        dragHandleClassName="drag-handle"
        dragAxis="y"
        bounds="parent"
        grid={[0, 10]}
        size={{ width: size.width, height: size.height }}
        position={{ x: position.x, y: position.y }}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        enableResizing={{ top: false, right: false, bottom: true, left: false }}
        style={{
          backgroundColor: bgColor,
          border,
          borderRadius: "4px",
          overflow: "hidden",
          padding: 0,
          boxSizing: "border-box",
          position: "relative"
        }}
      >
        {/* DRAG HANDLE region for guided tour step */}
        <div
          className="drag-handle"
          data-tour="drag-drop-timeblock"
          style={{
            width: "100%",
            height: "calc(100% - 20px)",
            cursor: "move",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <strong>{blockLabel}</strong>
        </div>

        {/* DELETE BUTTON */}
        <div
          data-tour="delete-timeblock"
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            cursor: "pointer",
            fontWeight: "bold",
            color: "red"
          }}
          onClick={handleDelete}
        >
          X
        </div>

        {/* EDIT BUTTON */}
        <div
          data-tour="edit-timeblock"
          style={{
            position: "absolute",
            top: 2,
            right: 22,
            cursor: "pointer",
            fontWeight: "bold",
            color: "cyan"
          }}
          onClick={e => {
            e.stopPropagation();
            if (typeof onEdit === "function") onEdit(block);
          }}
        >
          Edit
        </div>
      </Rnd>

      {/* Hover label showing live preview of new times */}
      {hoverTime && (
        <div
          style={{
            position: "absolute",
            left: position.x + 310,
            top: position.y,
            background: "#222",
            color: "#fff",
            padding: "4px 6px",
            borderRadius: "4px",
            fontSize: "0.8rem",
            pointerEvents: "none"
          }}
        >
          {hoverTime}
        </div>
      )}
    </>
  );
}

export default TimeBlock;
