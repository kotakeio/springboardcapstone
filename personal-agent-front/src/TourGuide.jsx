// ------------------------------------------------------------------
// Module:    src/TourGuide.jsx
// Author:    John Gibson
// Created:   2025‑04‑22
// Purpose:   React component that sets up an interactive UI tour
//            using react-joyride and dispatches custom events.
// ------------------------------------------------------------------

/**
 * @module src/TourGuide.jsx
 * @description
 *   - Configures and renders an interactive UI tour via react-joyride.
 *   - Dispatches events before and after each step for other components.
 *   - Provides controls for starting, navigating, and ending the tour.
 */

// ─────────────── Dependencies ───────────────
import React from 'react'
import Joyride, { EVENTS } from 'react-joyride'

// ─────────────── Tour Steps ───────────────
/**
 * @constant {Object[]} tourSteps
 * @description Configuration for each step in the tour.
 */
const tourSteps = [
  { target: '[data-tour="verify-email"]', disableBeacon: true,
    title: 'Verify Your Email',
    content: 'Click the "Verify" button next to an existing email to connect that calendar.',
    placement: 'right' },
  { target: '[data-tour="add-email"]', disableBeacon: true,
    title: 'Add New Email',
    content: 'Click this button to add a new calendar email if you need to connect another calendar.',
    placement: 'bottom' },
  // Time‑Block Steps
  { target: '[data-tour="delete-timeblock"]', disableBeacon: true,
    title: 'Delete a Time Block',
    content: 'Use the red "X" icon to remove this time block from your schedule.',
    placement: 'top' },
  { target: '[data-tour="edit-timeblock"]', disableBeacon: true,
    title: 'Edit a Time Block',
    content: 'Click "Edit" to open the block editor and adjust its start/end times.',
    placement: 'top' },
  { target: '[data-tour="drag-drop-timeblock"]', disableBeacon: true,
    title: 'Drag & Drop a Time Block',
    content: 'Drag this block by its main area to move it to a different time slot.',
    placement: 'top' },
  { target: '[data-tour="resize-timeblock"]', disableBeacon: true,
    title: 'Resize a Time Block',
    content: 'Drag the bottom edge to adjust the duration of a time block.',
    placement: 'top' },
  { target: '[data-tour="approve-timeblocks"]', disableBeacon: true,
    title: 'Approve Time Blocks',
    content: 'Click here to approve all unapproved time blocks and finalize your schedule.',
    placement: 'top' },
]

// ─────────────── Component ───────────────
/**
 * TourGuide component.
 * @param {Object} props
 * @param {boolean} props.runTour - Whether the tour is active.
 * @param {function} props.startTour - Starts the tour when invoked.
 * @param {function} props.clearTour - Clears tour state and stops it.
 */
export default function TourGuide({ runTour = false, startTour = () => {}, clearTour = () => {} }) {
  /**
   * Joyride callback: handles navigation and lifecycle events.
   * @param {Object} data - callback data from Joyride.
   */
  const joyrideCallback = ({ action, status, type, step, index }) => {
    // Close button pressed
    if (action === 'close') {
      clearTour()
      window.dispatchEvent(new CustomEvent('tourStepChange', { detail: { step: -1 } }))
      return
    }
    // Finished or skipped
    if (status === 'finished' || status === 'skipped') {
      clearTour()
      window.dispatchEvent(new CustomEvent('tourStepChange', { detail: { step: -1 } }))
      return
    }
    // Before each step
    if (type === EVENTS.STEP_BEFORE) {
      window.dispatchEvent(new CustomEvent('tourStepBefore', { detail: { target: step.target, stepIndex: index } }))
    }
    // After each step
    if (type === EVENTS.STEP_AFTER) {
      window.dispatchEvent(new CustomEvent('tourStepChange', { detail: { step: index } }))
    }
  }

  return (
    <>
      <Joyride
        steps={tourSteps}
        continuous
        showSkipButton
        showBackButton
        run={runTour}
        callback={joyrideCallback}
        styles={{ options: { zIndex: 10000, primaryColor: '#646cff', backgroundColor: '#333', arrowColor: '#646cff', textColor: '#fff' } }}
        locale={{ back: 'Back', next: 'Next', skip: 'Skip', last: 'Finish' }}
      />
      <button
        data-tour="help-button"
        onClick={startTour}
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 900, padding: '10px 15px', backgroundColor: '#646cff', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
      >
        Help
      </button>
    </>
  )
}
