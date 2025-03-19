// src/Login/CalendarOnboarding.jsx
import React, { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../axiosInstance"; // Ensure this path is correct

function CalendarOnboarding() {
  const [userEmails, setUserEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const { user } = useUser();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    fetchUserEmails();
  }, []);

  async function fetchUserEmails() {
    try {
      const { data } = await axiosInstance.get("/api/users/calendarEmails");
      if (data.success) {
        setUserEmails(data.emails);
      } else {
        setStatusMessage("Error fetching emails: " + data.message);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Network error fetching emails");
    }
  }

  async function handleAddEmail(e) {
    e.preventDefault();
    setStatusMessage("");
    if (!newEmail) return;
    try {
      const { data } = await axiosInstance.post("/api/users/calendarEmails", { email: newEmail });
      if (data.success) {
        setStatusMessage("Added new email!");
        setNewEmail("");
        fetchUserEmails();
      } else {
        setStatusMessage("Error adding email: " + data.message);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Network error adding email");
    }
  }

  async function handleVerify(emailId) {
    setStatusMessage("");
    try {
      const { data } = await axiosInstance.post(`/api/users/calendarEmails/${emailId}/verify`);
      if (data.success) {
        setStatusMessage("Verified email " + data.userEmail.email);
        fetchUserEmails();
      } else {
        setStatusMessage("Verification failed: " + data.message);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Network error verifying email");
    }
  }

  // Once user has verified at least one email, show "Next" button
  const hasVerifiedEmail = userEmails.some((ue) => ue.isCalendarOnboarded);

  function handleNext() {
    // Go to the new TimezonePage route
    navigate("/timezone-setup");
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
          <h2>Calendar Sharing Setup</h2>
          <p>
            To allow our app to access your Google Calendar, please share your
            calendar with our service account email: <strong>service@example.com</strong>
          </p>
          <ol>
            <li>Open Google Calendar & go to Sharing Settings.</li>
            <li>Locate the calendar you want to share.</li>
            <li>Click "Share with specific people".</li>
            <li>
              Add <strong>service@example.com</strong> with "Make changes to events".
            </li>
            <li>Save changes.</li>
          </ol>
  
          <h3>Your Calendar Emails</h3>
          {userEmails.length === 0 ? (
            <p>No emails found yet.</p>
          ) : (
            userEmails.map((ue) => (
              <div key={ue._id} style={{ marginBottom: "0.5rem" }}>
                <span>{ue.email}</span>
                {!ue.isCalendarOnboarded && (
                  <button
                    onClick={() => handleVerify(ue._id)}
                    style={{ marginLeft: "1rem" }}
                  >
                    Verify Calendar Access
                  </button>
                )}
                {ue.isCalendarOnboarded && (
                  <span style={{ marginLeft: "1rem", color: "green" }}>
                    Onboarded
                  </span>
                )}
              </div>
            ))
          )}
  
          <div
            style={{
              border: "2px solid #888",
              backgroundColor: "#333",
              borderRadius: "6px",
              padding: "1rem",
              marginTop: "1.5rem",
            }}
          >
            <h4>Add another calendar email</h4>
            <form
              onSubmit={handleAddEmail}
              style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}
            >
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Add a new email..."
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #888",
                  backgroundColor: "#3B3B3B",
                  color: "#fff",
                }}
              />
              <button type="submit" style={{ padding: "0.5rem 1rem" }}>
                Add Calendar
              </button>
            </form>
          </div>
  
          {hasVerifiedEmail && (
            <div style={{ marginTop: "1rem" }}>
              <button onClick={handleNext}>Next: Timezone Setup</button>
            </div>
          )}
  
          {statusMessage && (
            <p style={{ color: "blue", marginTop: "1rem" }}>{statusMessage}</p>
          )}
        </div>
      </div>
    );
  }
  
export default CalendarOnboarding;
