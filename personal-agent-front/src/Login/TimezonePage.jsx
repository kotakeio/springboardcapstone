// src/Login/TimezonePage.jsx
import React, { useState, useEffect } from "react";
import Select from "react-select";
import { useUser } from "../UserContext";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance"; // Import your Axios instance
// Optional: Import your static fallback list for timezones
import { timezoneOptions as staticTimezoneOptions } from "./allTimezones.js";

function TimezonePage() {
  const [selectedTimezone, setSelectedTimezone] = useState("");
  const [autoDetectedTZ, setAutoDetectedTZ] = useState("");
  const [timezoneOptions, setTimezoneOptions] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-detect user's timezone and load timezone options
    detectUserTimezone();
    loadTimezoneOptions();
  }, []);

  // Detect the user's timezone using the Intl API.
  function detectUserTimezone() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSelectedTimezone(tz);
    setAutoDetectedTZ(tz);
  }

  // Load the list of timezones dynamically if supported, otherwise fall back.
  function loadTimezoneOptions() {
    if (typeof Intl.supportedValuesOf === "function") {
      try {
        const dynamicTimezones = Intl.supportedValuesOf("timeZone");
        const options = dynamicTimezones.map((tz) => ({ value: tz, label: tz }));
        setTimezoneOptions(options);
      } catch (err) {
        console.warn("Intl.supportedValuesOf failed, using fallback timezones:", err);
        setTimezoneOptions(staticTimezoneOptions);
      }
    } else {
      setTimezoneOptions(staticTimezoneOptions);
    }
  }

  // Prepare the current selection for React Select.
  const currentTZ = timezoneOptions.find((tz) => tz.value === selectedTimezone);

  // Update the selected timezone when the user selects a new option.
  const handleTimezoneChange = (option) => {
    setSelectedTimezone(option.value);
  };

  // When the user finishes onboarding, update the user's timezone in the backend.
  async function handleFinishOnboarding() {
    setStatusMessage("");
    try {
      const { data } = await axiosInstance.put("/api/users/timezone", { timezone: selectedTimezone });
      if (data.success) {
        // Update the user context with the new timezone and mark onboarding as complete.
        setUser({
          ...user,
          timezone: selectedTimezone,
          onboardingCompleted: true,
        });
        navigate("/");
      } else {
        setStatusMessage("Error updating timezone: " + data.message);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Network error updating timezone");
    }
  }

  return (
    <div
      style={{
        marginTop: "100px",
        display: "flex",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          border: "2px solid #888",
          padding: "1rem",
          borderRadius: "6px",
          backgroundColor: "#333",
          color: "#fff",
          minWidth: "300px",
          maxWidth: "500px",
        }}
      >
        <h2>Time Zone Setup</h2>
        <p style={{ marginBottom: "0.5rem" }}>
          Auto-detected Timezone:{" "}
          <strong>{autoDetectedTZ || "Detecting..."}</strong>
        </p>

        <Select
          options={timezoneOptions}
          value={currentTZ}
          onChange={handleTimezoneChange}
          isSearchable
          placeholder="Search Timezones..."
          styles={{
            container: (provided) => ({
              ...provided,
              width: "100%",
              marginBottom: "1rem",
            }),
            control: (provided) => ({
              ...provided,
              backgroundColor: "#f0f0f0",
              borderColor: "#888",
              minHeight: "40px",
              boxShadow: "none",
              "&:hover": {
                borderColor: "#646cff",
              },
            }),
            singleValue: (provided) => ({
              ...provided,
              color: "#333",
            }),
            menu: (provided) => ({
              ...provided,
              backgroundColor: "#fff",
              color: "#333",
            }),
            placeholder: (provided) => ({
              ...provided,
              color: "#888",
            }),
          }}
        />

        <button onClick={handleFinishOnboarding} style={{ marginTop: "1rem" }}>
          Finish Onboarding
        </button>

        {statusMessage && (
          <p style={{ color: "blue", marginTop: "1rem" }}>{statusMessage}</p>
        )}
      </div>
    </div>
  );
}

export default TimezonePage;
