// ------------------------------------------------------------------
// Module:    src/RequireOnboarding.jsx
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Redirect to calendar onboarding if user hasn’t completed it.
// ------------------------------------------------------------------

/**
 * @module RequireOnboarding
 * @description
 *   Protects routes by ensuring users complete their calendar onboarding.
 *   If onboarding isn’t done, redirects to the onboarding flow.
 */

// ─────── Dependencies ───────
import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";

// ─────── Component: RequireOnboarding ───────

/**
 * Ensure the current user has completed onboarding.
 *
 * @param {Object} props.children  React children to render if onboarded.
 * @returns {JSX.Element}          The children or a <Navigate> redirect.
 */
export function RequireOnboarding({ children }) {
  const { user } = useUser();

  // Only redirect if the user is loaded and hasn’t completed onboarding
  if (user && !user.onboardingCompleted) {
    return <Navigate to="/calendar-onboarding" />;
  }

  // User is onboarded (or not yet loaded), render children
  return children;
}
