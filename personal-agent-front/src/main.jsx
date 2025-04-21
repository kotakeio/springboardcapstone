// ------------------------------------------------------------------
// Module:    ai-agents-frontend/src/main.jsx
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Entry point: renders React application with user context and routing.
// ------------------------------------------------------------------

/**
 * @module ai-agents-frontend/src/main.jsx
 * @description
 *   - Initializes and renders the root React component.
 *   - Wraps <App> with UserProvider and BrowserRouter for state management and routing.
 */

// ─────────────── Dependencies ───────────────
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { UserProvider } from './UserContext' // Ensure the import path is correct

// ─────────────── Application Render ───────────────

/**
 * Mounts the React application into the DOM.
 *
 * @returns {void}
 */
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </UserProvider>
  </React.StrictMode>
)
