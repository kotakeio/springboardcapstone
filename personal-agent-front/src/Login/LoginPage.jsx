// ------------------------------------------------------------------
// Module:    src/Login/LoginPage.jsx
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Renders login form, validates input, handles authentication,
//            shows loading indicator, and navigates on success.
// ------------------------------------------------------------------

/**
 * @module LoginPage
 * @description
 *   - Manages email & password state and validation.
///  - Submits credentials to the login API endpoint.
///  - Ensures a minimum spinner display time for UX consistency.
///  - Stores JWT token on success and redirects to the schedule page.
 */

// ─────────────── Dependencies ───────────────

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../UserContext";
import axiosInstance from "../axiosInstance";

// ─────────────── Validation Utilities ───────────────

/**
 * Check if the provided string is a valid email address.
 *
 * @param {string} email  The email to validate.
 * @returns {boolean}     True if `email` matches standard format.
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Ensure the password meets minimum length requirements.
 *
 * @param {string} password  The password to validate.
 * @returns {boolean}        True if `password` has at least 8 characters.
 */
const validatePassword = (password) => password.length >= 8;

// ─────────────── UI Utilities ───────────────

/**
 * Pause execution for a specified duration.
 *
 * @param {number} ms  Milliseconds to delay.
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * CSS-in-JS style for the loading spinner element.
 */
const spinnerStyle = {
  width: "20px",
  height: "20px",
  border: "3px solid #f3f3f3",
  borderTop: "3px solid #00e1ff",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  display: "inline-block",
  marginRight: "0.5rem",
};

// ─────────────── Component ───────────────

/**
 * LoginPage component.
 *
 * Renders a form for user login, handles validation, shows a spinner
 * for at least 3 seconds to avoid flicker, stores authentication token,
 * and navigates to the schedule on success.
 *
 * @returns {JSX.Element} The login page UI.
 */
function LoginPage() {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [errors, setErrors]       = useState({ email: "", password: "" });
  const [message, setMessage]     = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setUser }               = useUser();
  const navigate                  = useNavigate();

  /**
   * Update email state and validate format.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setErrors(prev => ({
      ...prev,
      email: validateEmail(value) ? "" : "Invalid email."
    }));
  };

  /**
   * Update password state and validate length.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setErrors(prev => ({
      ...prev,
      password: validatePassword(value)
        ? ""
        : "Password must be at least 8 characters."
    }));
  };

  /**
   * Handle form submission: validate fields, call API, enforce
   * minimum spinner time, store token, set user, and navigate.
   *
   * @param {React.FormEvent<HTMLFormElement>} e
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setMessage("All fields are required.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    const startTime = Date.now();

    try {
      const { data } = await axiosInstance.post("/api/users/login", {
        username: email,
        password
      });

      // Ensure spinner shows for at least 3 seconds to avoid flicker.
      const elapsed = Date.now() - startTime;
      if (elapsed < 3000) {
        await delay(3000 - elapsed);
      }

      if (data.success) {
        localStorage.setItem("token", data.token);
        setUser(data.user);
        navigate("/schedule");
      } else {
        setMessage(data.message || "Login failed.");
      }

    } catch (error) {
      console.error("Error logging in:", error);
      setMessage("An error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        marginTop: "100px",
        display: "flex",
        justifyContent: "center"
      }}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          border: "2px solid #888",
          padding: "1rem",
          borderRadius: "6px",
          backgroundColor: "#333",
          color: "#fff",
          minWidth: "300px",
          opacity: isLoading ? 0.6 : 1  // dim form while loading
        }}
      >
        <h2>Login</h2>

        {message && (
          <p style={{ color: "red" }}>
            {message}
          </p>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={handleEmailChange}
            required
            style={{
              display: "block",
              width: "100%",
              padding: "0.5rem",
              boxSizing: "border-box"
            }}
            disabled={isLoading}
          />
          {errors.email && (
            <span style={{ color: "red", fontSize: "0.9rem" }}>
              {errors.email}
            </span>
          )}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            required
            style={{
              display: "block",
              width: "100%",
              padding: "0.5rem",
              boxSizing: "border-box"
            }}
            disabled={isLoading}
          />
          {errors.password && (
            <span style={{ color: "red", fontSize: "0.9rem" }}>
              {errors.password}
            </span>
          )}
        </div>

        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div style={spinnerStyle} />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </button>

        <div style={{ marginTop: "1rem" }}>
          <p style={{ margin: 0 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#00e1ff" }}>
              Register here
            </Link>
          </p>
        </div>
      </form>

      {/* Inline keyframes for spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

export default LoginPage;
