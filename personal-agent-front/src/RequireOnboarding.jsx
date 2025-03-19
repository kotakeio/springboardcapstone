// src/RequireOnboarding.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext";

export function RequireOnboarding({ children }) {
  const { user } = useUser();

  if (user && !user.onboardingCompleted) {
    console.log("RequireOnboarding => not onboarded => redirect to /calendar-onboarding");
    return <Navigate to="/calendar-onboarding" />;
  }

  console.log("RequireOnboarding => onboarded => returning children");
  return children;
}
