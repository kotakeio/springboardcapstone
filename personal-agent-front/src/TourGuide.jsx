// ------------------------------------------------------------------
// Module:    src/TourGuide.jsx
// Author:    John Gibson
// Created:   2025‑04‑21
// Purpose:   React component that sets up an interactive UI tour
//            using react-joyride and dispatches custom events.
// ------------------------------------------------------------------

/**
 * @module src/TourGuide.jsx
 * @description
 *   - Configures and renders tour steps via react-joyride.
 *   - Emits 'tourStepBefore' and 'tourStepChange' events to allow
 *     other components to react before and after each step.
 *   - Provides a "Help" button to start the tour on demand.
 */

// ─────────────── Dependencies ───────────────
import React from 'react'
import Joyride, { EVENTS } from 'react-joyride'

// ─────────────── Tour Steps ───────────────
/**
 * @constant {Object[]} tourSteps
 * @description Array of configuration objects for each tour step.
 */
const tourSteps = [
  {
    target: '[data-tour="verify-email"]',
    disableBeacon: true,
    title: 'Verify Your Email',
    content: 'Click the "Verify" button next to an existing email to connect that calendar.',
    placement: 'right',
  },
  {
    target: '[data-tour="add-email"]',
    disableBeacon: true,
    title: 'Add New Email',
    content: 'Click this button to add a new calendar email if you need to connect another calendar.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="add-email-submit"]',
    disableBeacon: true,
    title: 'Submit New Email',
    content: 'Click “Submit” to add that email.',
    placement: 'right',
  },
  {
    target: '[data-tour="verify-new-email"]',
    disableBeacon: true,
    title: 'Verify Your New Email',
    content: 'Now click "Verify" next to the email you just added to connect its calendar.',
    placement: 'right',
  },

  // ───────── Time‑Block Steps ─────────
  {
    target: '[data-tour="delete-timeblock"]',
    disableBeacon: true,
    title: 'Delete a Time Block',
    content: 'Use the red "X" icon to remove this time block from your schedule.',
    placement: 'top',
  },
  {
    target: '[data-tour="edit-timeblock"]',
    disableBeacon: true,
    title: 'Edit a Time Block',
    content: 'Click "Edit" to open the block editor and adjust its start/end times.',
    placement: 'top',
  },
  {
    target: '[data-tour="blockeditor-modal"]',
    disableBeacon: true,
    title: 'Block Editor',
    content: 'This modal lets you fine‑tune the time block details.',
    placement: 'center',
  },
  {
    target: '[data-tour="blockeditor-start"]',
    disableBeacon: true,
    title: 'Edit Start Time',
    content: 'Click here to adjust when the block begins.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="blockeditor-end"]',
    disableBeacon: true,
    title: 'Edit End Time',
    content: 'Click here to adjust when the block ends.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="blockeditor-phone-alarm"]',
    disableBeacon: true,
    title: 'Set Phone Alarm',
    content: 'Use this to trigger a phone reminder at the block’s start.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="blockeditor-freedom-block"]',
    disableBeacon: true,
    title: 'Set Freedom Block',
    content: 'Use this to create a distraction‑free “Freedom Block” task.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="blockeditor-save"]',
    disableBeacon: true,
    title: 'Save Your Changes',
    content: 'Click “Save” to persist your edits and close the editor.',
    placement: 'right',
  },
  {
    target: '[data-tour="blockeditor-cancel"]',
    disableBeacon: true,
    title: 'Cancel Editing',
    content: 'Click “Cancel” to close without saving any changes.',
    placement: 'left',
  },
  {
    target: '[data-tour="drag-drop-timeblock"]',
    disableBeacon: true,
    title: 'Drag & Drop a Time Block',
    content: 'Drag this block by its main area to move it to a different time slot.',
    placement: 'top',
  },
  {
    target: '[data-tour="resize-timeblock"]',
    disableBeacon: true,
    title: 'Resize a Time Block',
    content: 'Drag the bottom edge to adjust the duration of a time block.',
    placement: 'top',
  },
  {
    target: '[data-tour="approve-timeblocks"]',
    disableBeacon: true,
    title: 'Approve Time Blocks',
    content: 'Click here to approve all unapproved time blocks and finalize your schedule.',
    placement: 'top',
  },
]

// ─────────────── Handlers ───────────────
/**
 * Handle Joyride lifecycle callbacks and dispatch custom events.
 *
 * @param {Object} data - Data object provided by Joyride.
 * @param {string} data.type - The event type (e.g., STEP_BEFORE, STEP_AFTER).
 * @param {string} data.action - The user action (e.g., 'close', 'skip').
 * @param {string} data.status - The tour status ('running', 'finished', etc.).
 * @param {number} data.index - Zero‑based index of the current step.
 * @param {Object} data.step - The step configuration object.
 */
function handleJoyrideCallback(data) {
  const { type, action, status, index, step } = data

  // Clear tour and notify end if user closes, skips, or the tour ends
  if (action === 'close' || action === 'skip' || type === EVENTS.TOUR_END) {
    clearTour()
    window.dispatchEvent(
      new CustomEvent('tourStepChange', { detail: { step: -1 } })
    )
    return
  }

  // BEFORE each step: allow components to prepare for the next step
  if (type === EVENTS.STEP_BEFORE) {
    window.dispatchEvent(
      new CustomEvent('tourStepBefore', {
        detail: { target: step.target, stepIndex: index },
      })
    )
  }

  // AFTER each step: notify components of step completion
  if (type === EVENTS.STEP_AFTER) {
    window.dispatchEvent(
      new CustomEvent('tourStepChange', { detail: { step: index } })
    )
  }

  // When the tour finishes or is skipped, clear and notify end
  if (status === 'finished' || status === 'skipped') {
    clearTour()
    window.dispatchEvent(
      new CustomEvent('tourStepChange', { detail: { step: -1 } })
    )
  }
}

// ─────────────── Component ───────────────
/**
 * TourGuide React component that renders the Joyride tour and Help button.
 *
 * @param {Object} props
 * @param {boolean} props.runTour - Flag to start/stop the tour.
 * @param {function} props.startTour - Function to initiate the tour.
 * @param {function} props.clearTour - Function to reset tour state.
 * @returns {JSX.Element} The Joyride component and Help button.
 */
export default function TourGuide({
  runTour = false,
  startTour = () => {},
  clearTour = () => {},
}) {
  return (
    <>
      <Joyride
        steps={tourSteps}
        continuous
        showSkipButton
        run={runTour}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#646cff',
            backgroundColor: '#333',
            arrowColor: '#646cff',
            textColor: '#fff',
          },
        }}
        locale={{ back: 'Back', next: 'Next', skip: 'Skip', last: 'Finish' }}
      />
      <button
        data-tour="help-button"
        onClick={startTour}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 900,
          padding: '10px 15px',
          backgroundColor: '#646cff',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Help
      </button>
    </>
  )
}
