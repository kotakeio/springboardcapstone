// src/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

function PrivateRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    console.log("PrivateRoute => Not Authenticated => redirecting to /login");
    return <Navigate to="/login" />;
  }
  console.log("PrivateRoute => Authenticated => returning children");
  return children;
}

export default PrivateRoute;
