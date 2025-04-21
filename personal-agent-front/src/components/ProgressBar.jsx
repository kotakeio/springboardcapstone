// ------------------------------------------------------------------
// Module:    src/components/ProgressBar.jsx
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Render a horizontal progress bar given an array of steps.
// ------------------------------------------------------------------

/**
 * @module ProgressBar
 * @description
 *   Displays a horizontal progress bar with multiple steps.
 *   Completed steps are styled as "done", pending steps as "pending".
 */

import React from "react";
import "./ProgressBar.css"; // Stylesheet for the progress bar component

// ─────────────── Component ───────────────

/**
 * ProgressBar component renders a series of steps.
 *
 * @param {Array<{ label: string, done: boolean }>} steps
 *   Array of step objects, each with a label and completion flag.
 * @returns {JSX.Element} The rendered progress bar.
 */
function ProgressBar({ steps }) {
  return (
    <div className="progress-bar">
      {steps.map((step, index) => (
        <div
          key={index}
          // Apply CSS class to indicate done vs. pending state
          className={`progress-step ${step.done ? "done" : "pending"}`}
        >
          {/* Step number (1-based index) */}
          <div className="step-number">{index + 1}</div>
          {/* Descriptive label for this step */}
          <div className="step-label">{step.label}</div>
        </div>
      ))}
    </div>
  );
}

export default ProgressBar;
