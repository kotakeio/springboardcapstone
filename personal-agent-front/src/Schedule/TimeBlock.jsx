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
/**
 * Rounds raw minutes to the nearest 5-min boundary.
 * E.g. 12 => 10, 13 => 15, etc.
 */
function snapTo5MinOffset(rawMinutes) {
  return Math.round(rawMinutes / 5) * 5;
}

function TimeBlock({ block, onUpdate, onEdit }) {
  // 1) Convert the block's start/end to dayjs
  const start = dayjs.utc(block.startTime).tz("America/Denver");
  const end = dayjs.utc(block.endTime).tz("America/Denver");

  // 2) Calculate initial position & size in px
  const effectiveStart = start.isBefore(dayStart) ? dayStart : start;
  const minutesFromDayStart = effectiveStart.diff(dayStart, "minute");
  const durationMinutes     = end.diff(start, "minute");

  const topPx = (minutesFromDayStart / MINUTES_PER_SLOT) * ROW_HEIGHT_PX;
  const heightPx = Math.max(
    (durationMinutes / MINUTES_PER_SLOT) * ROW_HEIGHT_PX,
    10
  );

  // 3) Local state for RND
  const [position, setPosition] = useState({ x: 100, y: topPx });
  const [size, setSize]         = useState({ width: 200, height: heightPx });
  const [hoverTime, setHoverTime] = useState("");

  // 4) Style based on approved vs. unapproved
  const bgColor = block.approved
    ? "rgba(0, 200, 255, 0.7)"
    : "rgba(0, 200, 255, 0.2)";
  const border  = block.approved ? "none" : "2px solid cyan";

  // We'll display the block's times in "h:mm A - h:mm A" format
  const blockLabel = `${start.format("h:mm A")} - ${end.format("h:mm A")}`;

  /**
   * Helper to convert y-position in px → a dayjs at nearest 5-min
   */
  function getSnappedStartTime(yPx) {
    const rawMinutes = (yPx / ROW_HEIGHT_PX) * MINUTES_PER_SLOT;
    const snapped    = snapTo5MinOffset(rawMinutes);
    return dayStart.add(snapped, "minute");
  }

  // ------------------ DRAG ------------------
  function handleDrag(e, d) {
    // As user drags, show a hover label with the new times
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
      // Update in DB
      const resp = await updateTimeBlock(
        block._id,
        newStart.toISOString(),
        newEnd.toISOString()
      );
      if (!resp.success) {
        alert("Error: " + resp.message);
        // revert position
        setPosition({ x: 100, y: topPx });
      } else {
        // Successfully updated, refetch or update parent
        onUpdate();
      }
    } catch (err) {
      console.error(err);
      setPosition({ x: 100, y: topPx });
    }
    setHoverTime("");
  }

  // ------------------ RESIZE ------------------
  function handleResize(e, direction, ref, delta, pos) {
    // As user resizes from bottom, show a hover label with the new times
    const newHeightPx  = parseFloat(ref.style.height);
    const newStart     = getSnappedStartTime(pos.y);
    const newDuration  = (newHeightPx / ROW_HEIGHT_PX) * MINUTES_PER_SLOT;
    const snappedDur   = snapTo5MinOffset(newDuration);
    const newEnd       = newStart.add(snappedDur, "minute");
    setHoverTime(`${newStart.format("h:mm A")} - ${newEnd.format("h:mm A")}`);
  }

  async function handleResizeStop(e, direction, ref, delta, pos) {
    const newHeightPx  = parseFloat(ref.style.height);
    const newStart     = getSnappedStartTime(pos.y);
    const newDuration  = (newHeightPx / ROW_HEIGHT_PX) * MINUTES_PER_SLOT;
    const snappedDur   = snapTo5MinOffset(newDuration);
    const newEnd       = newStart.add(snappedDur, "minute");

    try {
      const resp = await updateTimeBlock(
        block._id,
        newStart.toISOString(),
        newEnd.toISOString()
      );
      if (!resp.success) {
        alert("Error: " + resp.message);
        // revert
        setPosition({ x: 100, y: topPx });
        setSize({ width: 200, height: heightPx });
      } else {
        onUpdate();
      }
    } catch (err) {
      console.error(err);
      setPosition({ x: 100, y: topPx });
      setSize({ width: 200, height: heightPx });
    }
    setHoverTime("");
  }

  // ------------------ DELETE ------------------
  async function handleDelete(e) {
    // Make sure we don't accidentally drag
    e.stopPropagation();
    if (!window.confirm("Delete this block?")) return;
    try {
      const resp = await deleteTimeBlock(block._id);
      if (!resp.success) {
        alert("Error deleting block: " + resp.message);
      } else {
        onUpdate();
      }
    } catch (err) {
      console.error(err);
      alert("Network error deleting block");
    }
  }

  // ------------------ RENDER ------------------
  return (
    <>
      <Rnd
        // 1) We'll specify a handle className:
        dragHandleClassName="drag-handle"
        // (That means only elements with "drag-handle" can be used to move.)

        // 2) We remove dragCancel since we only drag with the handle
        dragAxis="y"
        bounds="parent"
        grid={[0, 10]}
        size={{ width: size.width, height: size.height }}
        position={{ x: position.x, y: position.y }}

        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResize={handleResize}
        onResizeStop={handleResizeStop}
        enableResizing={{
          top: false,
          right: false,
          bottom: true,
          left: false,
        }}
        style={{
          backgroundColor: bgColor,
          border,
          borderRadius: "4px",
          // We'll leave cursor normal here, 
          // so the handle is the only "move" cursor
          overflow: "hidden",
          padding: 0,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* 
          DRAG HANDLE: Only this region can be used to move the block.
          Everything else => normal clicks won't cause a drag.
        */}
        <div
          className="drag-handle"
          style={{
            width: "100%",
            height: "calc(100% - 20px)", 
            // This leaves 20px at the top for "X" & "Edit" so they aren't draggable
            backgroundColor: "transparent",
            cursor: "move",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <strong>{blockLabel}</strong>
        </div>

        {/* "X" => top-right => non-draggable, so no "drag-handle" class */}
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            cursor: "pointer",
            fontWeight: "bold",
            color: "red",
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(e);
          }}
        >
          X
        </div>

        {/* "Edit" => also in top bar => no "drag-handle" => not draggable */}
        <div
          style={{
            position: "absolute",
            top: 2,
            right: 22,
            cursor: "pointer",
            fontWeight: "bold",
            color: "cyan",
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (typeof onEdit === "function") onEdit(block);
          }}
        >
          Edit
        </div>
      </Rnd>

      {/* HoverTime overlay */}
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
            pointerEvents: "none",
          }}
        >
          {hoverTime}
        </div>
      )}
    </>
  );
}

export default TimeBlock;
