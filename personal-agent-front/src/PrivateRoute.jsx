// ------------------------------------------------------------------
// Module:    src/PrivateRoute.jsx
// Author:    John Gibson
// Created:   2025‑04‑21
// Purpose:   Restrict access to protected routes based on authentication.
// ------------------------------------------------------------------

/**
 * @module PrivateRoute
 * @description
 *   Protects routes by verifying user authentication.
 *   Redirects unauthenticated users to the login page.
 */

// ─────── Dependencies ───────
import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";

// ─────── Component ───────

/**
 * Wraps protected content and ensures only authenticated users can access it.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children  The protected content to render.
 * @returns {React.ReactNode}               Either the children or a redirect element.
 */
function PrivateRoute({ children }) {
  // Retrieve the current user from context
  const { user } = useUser();

  // If the user is not authenticated, redirect to the login page
  if (!user) {
    return <Navigate to="/login" />;
  }

  // User is authenticated; render the protected content
  return children;
}

// ─────── Export ───────
export default PrivateRoute;
