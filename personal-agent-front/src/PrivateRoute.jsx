// src/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "./UserContext"; // Import the user context

function PrivateRoute({ children }) {
  const { user } = useUser(); // Get the current user from context

  // If no user is found, the user is not authenticated, so redirect to login
  if (!user) {
    console.log("PrivateRoute => No user in context => redirecting to /login");
    return <Navigate to="/login" />;
  }

  // If a user exists, allow rendering the protected content
  console.log("PrivateRoute => User found, returning children");
  return children;
}

export default PrivateRoute;
