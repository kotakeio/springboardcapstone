// ------------------------------------------------------------------
// Module:    src/Home.jsx
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Landing page component for AI Agents with navigation
//            to the schedule view.
// ------------------------------------------------------------------

/**
 * @module Home
 * @description
 *   React component that renders the AI Agents landing page
 *   and provides a button to navigate to the schedule screen.
 */

// ─────────────── Dependencies ───────────────
import React from "react";
import { useNavigate } from "react-router-dom";

// ─────────────── Component ───────────────

/**
 * Home component renders the AI Agents landing page.
 *
 * @returns {JSX.Element} The Home component UI.
 */
function Home() {
  const navigate = useNavigate();

  /**
   * Navigate to the "/schedule" route when the user clicks the button.
   *
   * @returns {void}
   */
  const handleSchedule = () => {
    // using react‑router navigation to switch views without reload
    navigate("/schedule");
  };

  return (
    <div style={{ margin: 20 }}>
      <h2>AI Agents</h2>
      <button onClick={handleSchedule}>Go to Schedule</button>
    </div>
  );
}

// ─────────────── Exports ───────────────

export default Home;
