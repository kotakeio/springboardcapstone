// ------------------------------------------------------------------
// Module:    src/Schedule/Schedule.jsx
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   React component to fetch and render today’s schedule:
//            appointments, time blocks, approval workflow, and tour.
// ------------------------------------------------------------------

/**
 * @module Schedule
 * @description
 *   - Fetches today’s appointments and freedom blocks from the API.
 *   - Manages loading state, error handling, and approval actions.
 *   - Provides an interactive tour and calendar email setup UI.
 */

 // ─────────────── Dependencies ───────────────
 import React, { useState, useEffect, useRef } from "react";
 import dayjs from "dayjs";
 import utc from "dayjs/plugin/utc";
 import timezone from "dayjs/plugin/timezone";
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
 import ProgressBar from "../components/ProgressBar";
 import TourGuide from "../TourGuide";
 
 // Extend dayjs with UTC and timezone support
 dayjs.extend(utc);
 dayjs.extend(timezone);
 
  // ─────────────── Constants ───────────────
 /**
  * Spinner style for the "Approve All Blocks" button.
  */
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
 
  // ─────────────── Utility Functions ───────────────
 
 /**
  * Pause execution for a given number of milliseconds.
  * @param {number} ms  Milliseconds to delay.
  * @returns {Promise<void>}
  */
 const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
 
  // ─────────────── Component: Schedule ───────────────
 
 /**
  * Render today’s schedule view.
  *
  * @component
  * @returns {JSX.Element} The schedule UI.
  */
 function Schedule() {
   // ─ State & Refs ─
   const [appointments, setAppointments] = useState([]);
   const [timeBlocks, setTimeBlocks] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState("");
   const [editBlock, setEditBlock] = useState(null);
   const [isApproving, setIsApproving] = useState(false);
   const [progressSteps, setProgressSteps] = useState([
     { label: "Account Created", done: true },
     { label: "Email Verified", done: false },
   ]);
   // Separate “open accordion” from “run tour” for Joyride integration
   const [tourActive, setTourActive] = useState(false);
   const [accordionForTour, setAccordionForTour] = useState(false);
   const scrollContainerRef = useRef(null);
 
   // ─── Data Fetching ───
 
   /**
    * Load today’s schedule data from the API.
    * Updates loading, error, progress steps, appointments, and time blocks.
    */
   async function loadData() {
     try {
       setLoading(true);
       setError("");
       const data = await fetchTodaySchedule();
 
       if (data.success) {
         if (!data.verified) {
           // No calendar verified → update progress and show error
           setProgressSteps([
             { label: "Account Created", done: true },
             { label: "Email Verified", done: false },
             { label: "Calendar Setup", done: false },
           ]);
           setError("No verified calendar emails found. Please verify or add an email.");
           setAppointments([]);
           setTimeBlocks([]);
         } else {
           // Calendar is set up → mark steps and populate data
           setProgressSteps([
             { label: "Account Created", done: true },
             { label: "Email Verified", done: true },
             { label: "Calendar Setup", done: (data.appointments?.length > 0) },
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
 
   // Initial data fetch on mount
   useEffect(() => {
     loadData();
   }, []);
 
   // ─── Auto‑Scroll to Current Time ───
   useEffect(() => {
     if (!loading && scrollContainerRef.current) {
       const now = dayjs().tz("America/Denver");
       // Compute pixel offset so that current time is visible
       const diffMinutes = Math.max(now.diff(dayStart, "minute"), 0);
       const offset = (diffMinutes / MINUTES_PER_SLOT) * ROW_HEIGHT_PX;
       scrollContainerRef.current.scrollTop = Math.max(offset - 10, 0);
     }
   }, [loading]);
 
   // ─── Display Blocks Fallback ───
   const displayTimeBlocks = error
     ? [
         {
           _id: "dummy",
           startTime: dayStart.toISOString(),
           endTime: dayStart.add(30, "minute").toISOString(),
           approved: false,
         },
       ]
     : timeBlocks;
 
   // ─── Tour Step Handler ───
   useEffect(() => {
     const onStep = (e) => {
       if (e.detail.target === '[data-tour="blockeditor-modal"]') {
         setEditBlock(displayTimeBlocks[0]);
       }
     };
     window.addEventListener("tourStepBefore", onStep);
     return () => window.removeEventListener("tourStepBefore", onStep);
   }, [displayTimeBlocks]);
 
   // ─── Event Handlers ───
 
   /**
    * Open the BlockEditor for a given time block.
    * @param {Object} block  The block to edit.
    */
   function handleEditBlock(block) {
     setEditBlock(block);
   }
 
   /**
    * Approve all unapproved blocks via API.
    * Ensures button is shown for at least 3s to avoid flicker.
    */
   async function handleApproveAll() {
     setIsApproving(true);
     const start = Date.now();
     try {
       const { data } = await axiosInstance.post("/api/freedom-blocks/approveAll");
       const elapsed = Date.now() - start;
       if (elapsed < 3000) {
         await delay(3000 - elapsed);
       }
       data.success ? loadData() : alert("Error approving blocks: " + data.message);
     } catch (err) {
       alert("Network error approving blocks");
       console.error("Approval error:", err);
     } finally {
       setIsApproving(false);
     }
   }
 
   // ─── Grid Line Generation ───
   const totalSlots = ((END_HOUR - START_HOUR) * 60) / MINUTES_PER_SLOT;
   const containerHeight = totalSlots * ROW_HEIGHT_PX;
   const gridLines = [];
   let current = dayStart;
   for (let i = 0; i <= totalSlots; i++) {
     gridLines.push({
       top: i * ROW_HEIGHT_PX,
       label: current.format("h:mm A"),
     });
     current = current.add(MINUTES_PER_SLOT, "minute");
   }
 
   // ─── Render ───
   return (
     <div className="schedule-container">
       <h2>Today's Schedule</h2>
       <ProgressBar steps={progressSteps} />
 
       {loading ? (
         <div>Loading schedule...</div>
       ) : (
         <>
           {error && (
             <div style={{ color: "red", marginBottom: "1rem" }}>
               <p>{error}</p>
             </div>
           )}
 
           <CalendarEmailManager
             onCalendarUpdate={loadData}
             forceOpen={accordionForTour}
           />
 
           {displayTimeBlocks.some((b) => !b.approved) && (
             <button
               data-tour="approve-timeblocks"
               onClick={handleApproveAll}
               disabled={isApproving}
             >
               {isApproving ? (
                 <>
                   <div style={spinnerStyle} /> Approving Blocks...
                 </>
               ) : (
                 "Approve All Blocks"
               )}
             </button>
           )}
 
           <hr className="day-column-divider" />
 
           <div className="day-column-outer" ref={scrollContainerRef}>
             <div className="day-column-inner" style={{ height: containerHeight }}>
               {gridLines.map((line, idx) => (
                 <div
                   key={idx}
                   className="schedule-grid-line"
                   style={{ top: line.top }}
                 >
                   <span className="schedule-grid-line-label">{line.label}</span>
                 </div>
               ))}
 
               {appointments.map((appt, idx) => {
                 const style = getEventStyle(
                   appt.start?.dateTime,
                   appt.end?.dateTime,
                   true
                 );
                 return (
                   <div
                     key={idx}
                     style={{
                       ...style,
                       backgroundColor: "rgba(255,150,150,0.7)",
                       border: "1px solid rgba(255,100,100,0.7)",
                     }}
                   >
                     <strong>{appt.summary || "Appointment"}</strong>
                   </div>
                 );
               })}
 
               {displayTimeBlocks.map((block) => (
                 <TimeBlock
                   key={block._id}
                   block={block}
                   onUpdate={loadData}
                   onEdit={handleEditBlock}
                 />
               ))}
 
               {editBlock && (
                 <BlockEditor
                   block={editBlock}
                   onClose={() => setEditBlock(null)}
                   onSaved={loadData}
                 />
               )}
             </div>
           </div>
 
           <TourGuide
             runTour={tourActive}
             startTour={() => {
               // open accordion then launch tour
               setAccordionForTour(true);
               setTimeout(() => setTourActive(true), 0);
             }}
             clearTour={() => {
               setTourActive(false);
               setAccordionForTour(false);
             }}
           />
         </>
       )}
 
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
 