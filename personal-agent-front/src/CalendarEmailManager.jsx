// src\CalendarEmailManager.jsx

import React, { useState, useEffect } from "react";
import axiosInstance from "./axiosInstance";

function CalendarEmailManager({ onEmailsUpdated, onCalendarUpdate }) {
  const [emails, setEmails] = useState([]);
  // Initialize statusMessage as an empty string. It can now hold either text or JSX.
  const [statusMessage, setStatusMessage] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState(null);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);

  // ----------------------------
  //  Fetch Emails on Mount
  // ----------------------------
  async function fetchEmails() {
    try {
      const { data } = await axiosInstance.get("/api/users/calendarEmails");
      if (data.success) {
        setEmails(data.emails);
        // Update parent's email list if needed
        if (onEmailsUpdated) {
          onEmailsUpdated(data.emails);
        }
        // Accordion auto-open/close logic
        const hasVerified = data.emails.some((e) => e.isCalendarOnboarded);
        setIsAccordionOpen(!hasVerified);
      } else {
        setStatusMessage("Error fetching emails: " + data.message);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Network error fetching emails");
    }
  }

  useEffect(() => {
    fetchEmails();
  }, []);

  // ----------------------------
  //  Toggle Accordion
  // ----------------------------
  function toggleAccordion() {
    setIsAccordionOpen(!isAccordionOpen);
  }

  // ----------------------------
  //  Handle Verification
  // ----------------------------
  async function handleVerify(emailId) {
    // Clear previous status message
    setStatusMessage("");
    try {
      const { data } = await axiosInstance.post(
        `/api/users/calendarEmails/${emailId}/verify`
      );
      if (data.success) {
        setStatusMessage("Verified email: " + data.userEmail.email);
        // Refresh emails and calendar schedule
        fetchEmails();
        if (onCalendarUpdate) {
          onCalendarUpdate();
        }
      } else {
        // Replace error message with calendar sharing instructions
        setStatusMessage(
          <>
            <h2>Calendar Sharing Setup</h2>
            <p>
              To allow our app to access your Google Calendar, please share your
              calendar with our service account email:{" "}
              <strong>
                agent-692@pc-api-6250374257814573220-956.iam.gserviceaccount.com
              </strong>
            </p>
            <ol>
              <li>Open Google Calendar &amp; locate the calendar you want to share.</li>
              <li>Go to Settings and sharing.</li>
              <li>Click "Share with specific people".</li>
              <li>
                Add{" "}
                <strong>
                  agent-692@pc-api-6250374257814573220-956.iam.gserviceaccount.com
                </strong>{" "}
                with "Make changes to events".
              </li>
              <li>Save changes.</li>
            </ol>
          </>
        );
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.message) {
        setStatusMessage(
          <>
            <h2>Calendar Sharing Setup</h2>
            <p>
              To allow our app to access your Google Calendar, please share your
              calendar with our service account email:{" "}
              <strong>
                agent-692@pc-api-6250374257814573220-956.iam.gserviceaccount.com
              </strong>
            </p>
            <ol>
              <li>Open Google Calendar &amp; locate the calendar you want to share.</li>
              <li>Go to Settings and sharing.</li>
              <li>Click "Share with specific people".</li>
              <li>
                Add{" "}
                <strong>
                  agent-692@pc-api-6250374257814573220-956.iam.gserviceaccount.com
                </strong>{" "}
                with "Make changes to events".
              </li>
              <li>Save changes.</li>
            </ol>
          </>
        );
      } else {
        setStatusMessage("Network error verifying email");
      }
    }
  }

  // ----------------------------
  //  Handle Deletion (Open Modal)
  // ----------------------------
  function handleOpenDeleteModal(emailObj) {
    setEmailToDelete(emailObj);
    setIsDeleteModalOpen(true);
    setStatusMessage("");
  }

  // ----------------------------
  //  Confirm Deletion
  // ----------------------------
  async function handleConfirmDelete() {
    if (!emailToDelete) return;
    const { _id, email } = emailToDelete;
    setStatusMessage("");
    try {
      const { data } = await axiosInstance.delete(
        `/api/users/calendarEmails/${_id}`
      );
      if (data.success) {
        setStatusMessage(`Deleted email: ${email}`);
        fetchEmails();
        if (onCalendarUpdate) {
          onCalendarUpdate();
        }
      } else {
        setStatusMessage(`Error deleting email: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Network error deleting email");
    } finally {
      setIsDeleteModalOpen(false);
      setEmailToDelete(null);
    }
  }
  // ----------------------------
  //  Handle Adding a New Email
  // ----------------------------
  async function handleAddEmail(e) {
    e.preventDefault();
    if (!newEmail) return;
    setStatusMessage("");
    try {
      const { data } = await axiosInstance.post("/api/users/calendarEmails", {
        email: newEmail,
      });
      if (data.success) {
        setStatusMessage("Added new email!");
        setNewEmail("");
        setIsAddModalOpen(false);
        fetchEmails();
        if (onCalendarUpdate) {
          onCalendarUpdate();
        }
      } else {
        setStatusMessage("Error adding email: " + data.message);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Network error adding email");
    }
  }

  // ----------------------------
  //  Render
  // ----------------------------
  return (
    <div
      style={{
        border: "2px solid #888",
        padding: "1rem",
        borderRadius: "6px",
        backgroundColor: "#333",
        color: "#fff",
        marginBottom: "1rem",
      }}
    >
      {/* Accordion Header */}
      <div
        onClick={toggleAccordion}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3 style={{ margin: 0 }}>Your Calendar Emails</h3>
        <span>{isAccordionOpen ? "▲" : "▼"}</span>
      </div>

      {/* Accordion Content */}
      {isAccordionOpen && (
        <>
          {emails.length === 0 ? (
            <p>No emails found yet.</p>
          ) : (
            emails.map((ue) => (
              <div
                key={ue._id}
                style={{
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {/* "X" icon for deletion */}
                <button
                  onClick={() => handleOpenDeleteModal(ue)}
                  style={{
                    marginRight: "0.5rem",
                    background: "none",
                    border: "none",
                    color: "red",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  X
                </button>
                <span>{ue.email}</span>
                {ue.isCalendarOnboarded ? (
                  <span style={{ marginLeft: "1rem", color: "#32CD32" }}>
                    Verified
                  </span>
                ) : (
                  <button
                    onClick={() => handleVerify(ue._id)}
                    style={{ marginLeft: "1rem" }}
                  >
                    Verify
                  </button>
                )}
              </div>
            ))
          )}

          {/* Status Message */}
          {statusMessage && (
            <div style={{ color: "#1E90FF", marginTop: "0.5rem" }}>
              {statusMessage}
            </div>
          )}

          {/* Add Email Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{ marginTop: "1rem" }}
          >
            Add Email
          </button>
        </>
      )}

      {/* ADD EMAIL MODAL */}
      {isAddModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#444",
              padding: "1rem",
              borderRadius: "6px",
              minWidth: "300px",
              maxWidth: "400px",
              width: "90%",
              color: "#fff",
              boxSizing: "border-box",
            }}
          >
            <h4 style={{ marginTop: 0 }}>Add a New Email</h4>
            <form onSubmit={handleAddEmail}>
              <input
                type="email"
                placeholder="Enter email..."
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginBottom: "0.5rem",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                }}
              >
                <button type="submit">Submit</button>
                <button type="button" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && emailToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: "#444",
              padding: "1rem",
              borderRadius: "6px",
              minWidth: "300px",
              maxWidth: "400px",
              width: "90%",
              color: "#fff",
              boxSizing: "border-box",
            }}
          >
            <h4 style={{ marginTop: 0 }}>Delete Email</h4>
            <p>
              Are you sure you want to delete:{" "}
              <strong>{emailToDelete.email}</strong>?
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                onClick={handleConfirmDelete}
                style={{ backgroundColor: "red", color: "#fff" }}
              >
                Yes
              </button>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setEmailToDelete(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarEmailManager;
