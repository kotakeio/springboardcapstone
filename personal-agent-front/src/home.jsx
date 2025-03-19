// src/Home.jsx
import React from "react";
import { useNavigate } from "react-router-dom"; // import useNavigate from react-router-dom

function Home() {
  const navigate = useNavigate();

  // This function now navigates to "/schedule"
  const handleSchedule = () => {
    navigate("/schedule");
  };

  return (
    <div style={{ margin: 20 }}>
      <h2>AI Agents</h2>
      <button onClick={handleSchedule}>Go to Schedule</button>
    </div>
  );
}

export default Home;
