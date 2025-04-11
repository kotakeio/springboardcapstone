// src/components/ProgressBar.jsx
import React from "react";
import "./ProgressBar.css"; // Create a stylesheet for styles

function ProgressBar({ steps }) {
  return (
    <div className="progress-bar">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`progress-step ${step.done ? "done" : "pending"}`}
        >
          <div className="step-number">{index + 1}</div>
          <div className="step-label">{step.label}</div>
        </div>
      ))}
    </div>
  );
}

export default ProgressBar;
