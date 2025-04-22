// ------------------------------------------------------------------
// Module:    src/CalendarEmailManager.jsx
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   React component for managing user calendar emails:
//            fetching, verifying, adding, and deleting.
// ------------------------------------------------------------------

/**
 * @module CalendarEmailManager
 * @description
 *   Provides a UI for users to manage their calendar emails:
 *     - Fetch existing calendar‐shared emails
 *     - Verify calendar sharing setup
 *     - Add new emails
 *     - Delete emails
 *   Supports both controlled and internal accordion open state,
 *   and notifies parent components via callbacks.
 */

// ─────── Dependencies ───────
import React, { useState, useEffect, useLayoutEffect } from "react"
import axiosInstance from "./axiosInstance"

// ─────── Utilities ───────

/**
 * Pause execution for at least the given number of milliseconds.
 * Ensures a minimum spinner duration for UX consistency.
 *
 * @param {number} ms  Milliseconds to wait.
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ─────── Component Definition ───────

/**
 * CalendarEmailManager component.
 *
 * @param {Object}   props
 * @param {function(Object[])} props.onEmailsUpdated  Called after emails are fetched.
 * @param {function()}       props.onCalendarUpdate  Called after verify/add/delete actions.
 * @param {boolean}          props.forceOpen         If true, accordion remains open.
 * @param {boolean}         [props.accordionOpen]    Controlled accordion open state.
 */
export default function CalendarEmailManager({
  onEmailsUpdated,
  onCalendarUpdate,
  forceOpen,
  accordionOpen: controlledAccordionOpen,
}) {
  // ─────── State ───────
  const [emails, setEmails] = useState([])
  const [statusMessage, setStatusMessage] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [emailToDelete, setEmailToDelete] = useState(null)
  const [verifyingEmailId, setVerifyingEmailId] = useState(null)
  const [isAddingEmail, setIsAddingEmail] = useState(false)
  const [newlyAddedEmailId, setNewlyAddedEmailId] = useState(null)

  // Internal open state if uncontrolled
  const [internalAccordionOpen, setInternalAccordionOpen] = useState(
    forceOpen || false
  )
  const isAccordionOpen =
    controlledAccordionOpen !== undefined
      ? controlledAccordionOpen
      : internalAccordionOpen

  // ─────── Handlers ───────

  /**
   * Fetch the list of calendar emails from the server.
   */
  async function fetchEmails() {
    try {
      const { data } = await axiosInstance.get("/api/users/calendarEmails")
      if (data.success) {
        setEmails(data.emails)
        onEmailsUpdated?.(data.emails)
        // Collapse if any verified email exists when uncontrolled
        const hasVerified = data.emails.some((e) => e.isCalendarOnboarded)
        if (controlledAccordionOpen === undefined && !forceOpen) {
          setInternalAccordionOpen(!hasVerified)
        }
      } else {
        setStatusMessage("Error fetching emails: " + data.message)
      }
    } catch (err) {
      console.error(err)
      setStatusMessage("Network error fetching emails")
    }
  }

  /**
   * Verify calendar sharing setup for a given email.
   * Ensures at least a 3s spinner for a consistent UX.
   *
   * @param {string} emailId  ID of the email to verify.
   */
  async function handleVerify(emailId) {
    setStatusMessage("")
    setVerifyingEmailId(emailId)
    const startTime = Date.now()
    try {
      const { data } = await axiosInstance.post(
        `/api/users/calendarEmails/${emailId}/verify`
      )
      const elapsed = Date.now() - startTime
      if (elapsed < 3000) await delay(3000 - elapsed)

      if (data.success) {
        setStatusMessage("Verified email: " + data.userEmail.email)
        fetchEmails()
        onCalendarUpdate?.()
      } else {
        setStatusMessage(
          <>
            <h2>Calendar Sharing Setup</h2>
            <p>
              To allow our app to access your Google Calendar, please share
              your calendar with our service account email:&nbsp;
              <strong>agent-692@pc-api-6250374257814573220-956.iam.gserviceaccount.com</strong>
            </p>
            <ol>
              <li>Open Google Calendar &amp; locate the calendar.</li>
              <li>Go to Settings and sharing.</li>
              <li>Click “Share with specific people.”</li>
              <li>Add the service account with “Make changes to events.”</li>
              <li>Save changes.</li>
            </ol>
          </>
        )
      }
    } catch (err) {
      console.error(err)
      setStatusMessage("Network error verifying email")
    } finally {
      setVerifyingEmailId(null)
    }
  }

  /**
   * Add a new calendar email via the API.
   * Maintains a 3s minimum spinner for UX consistency.
   *
   * @param {Event} e  Form submission event.
   */
  async function handleAddEmail(e) {
    e.preventDefault()
    if (!newEmail) return
    setStatusMessage("")
    setIsAddingEmail(true)
    const startTime = Date.now()
    try {
      const { data } = await axiosInstance.post("/api/users/calendarEmails", {
        email: newEmail,
      })
      const elapsed = Date.now() - startTime
      if (elapsed < 3000) await delay(3000 - elapsed)

      if (data.success) {
        setStatusMessage("Added new email!")
        setNewEmail("")
        setIsAddModalOpen(false)
        setNewlyAddedEmailId(data.userEmail._id)
        fetchEmails()
        onCalendarUpdate?.()
      } else {
        setStatusMessage("Error adding email: " + data.message)
      }
    } catch (err) {
      console.error(err)
      setStatusMessage("Network error adding email")
    } finally {
      setIsAddingEmail(false)
    }
  }

  /**
   * Open the delete confirmation modal for the selected email.
   *
   * @param {Object} emailObj  Email object chosen for deletion.
   */
  function handleOpenDeleteModal(emailObj) {
    setEmailToDelete(emailObj)
    setIsDeleteModalOpen(true)
    setStatusMessage("")
  }

  /**
   * Confirm deletion of the selected email via the API.
   */
  async function handleConfirmDelete() {
    if (!emailToDelete) return
    const { _id, email } = emailToDelete
    setStatusMessage("")
    try {
      const { data } = await axiosInstance.delete(
        `/api/users/calendarEmails/${_id}`
      )
      if (data.success) {
        setStatusMessage(`Deleted email: ${email}`)
        fetchEmails()
        onCalendarUpdate?.()
      } else {
        setStatusMessage(`Error deleting email: ${data.message}`)
      }
    } catch (err) {
      console.error(err)
      setStatusMessage("Network error deleting email")
    } finally {
      setIsDeleteModalOpen(false)
      setEmailToDelete(null)
    }
  }

  // ─────── Effects ───────

  // Fetch emails once on mount
  useEffect(() => {
    fetchEmails()
  }, [])

  // Keep accordion open when forced
  useLayoutEffect(() => {
    if (forceOpen) setInternalAccordionOpen(true)
  }, [forceOpen])

  // Respond to tour events by opening accordion or modals
  useLayoutEffect(() => {
    const handler = (e) => {
      const { target } = e.detail
      if (
        target === '[data-tour="verify-email"]' ||
        target === '[data-tour="add-email"]' ||
        target === '[data-tour="add-email-input"]'
      ) {
        setInternalAccordionOpen(true)
      }
      if (target === '[data-tour="confirm-delete-email"]' && emails.length) {
        handleOpenDeleteModal(emails[0])
      }
    }
    window.addEventListener("tourStepBefore", handler)
    return () => window.removeEventListener("tourStepBefore", handler)
  }, [emails])

  // Listen for custom event to open the Add‑Email modal
  useLayoutEffect(() => {
    const openModal = () => {
      setInternalAccordionOpen(true)
      setIsAddModalOpen(true)
    }
    window.addEventListener("openAddEmailModal", openModal)
    return () => window.removeEventListener("openAddEmailModal", openModal)
  }, [])

  // ─────── Helpers ───────

  /**
   * Toggle the accordion when uncontrolled.
   */
  function toggleAccordion() {
    if (controlledAccordionOpen === undefined) {
      setInternalAccordionOpen((o) => !o)
    }
  }

  // ─────── Render ───────
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
                <button
                  data-tour="delete-email-button"
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
                  <span
                    style={{ marginLeft: "1rem", color: "#32CD32" }}
                  >
                    Verified
                  </span>
                ) : (
                  <button
                    data-tour={
                      ue._id === newlyAddedEmailId
                        ? "verify-new-email"
                        : "verify-email"
                    }
                    onClick={() => handleVerify(ue._id)}
                    style={{ marginLeft: "1rem" }}
                    disabled={verifyingEmailId === ue._id}
                  >
                    {verifyingEmailId === ue._id
                      ? "Verifying..."
                      : "Verify"}
                  </button>
                )}
              </div>
            ))
          )}

          {statusMessage && (
            <div
              style={{ color: "#1E90FF", marginTop: "0.5rem" }}
            >
              {statusMessage}
            </div>
          )}

          <button
            data-tour="add-email"
            onClick={() => setIsAddModalOpen(true)}
            style={{ marginTop: "1rem" }}
            disabled={isAddingEmail}
          >
            {isAddingEmail ? (
              <div
                className="spinner"
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid #f3f3f3",
                  borderTop: "2px solid #00e1ff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  display: "inline-block",
                  marginRight: "0.5rem",
                }}
              />
            ) : (
              "Add Email"
            )}
          </button>

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
                    data-tour="add-email-input"
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
                    disabled={isAddingEmail}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "0.5rem",
                    }}
                  >
                    <button
                      data-tour="add-email-submit"
                      type="submit"
                      disabled={isAddingEmail}
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      disabled={isAddingEmail}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
                    data-tour="confirm-delete-email"
                    onClick={handleConfirmDelete}
                    style={{ backgroundColor: "red", color: "#fff" }}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false)
                      setEmailToDelete(null)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}
    </div>
  )
}
