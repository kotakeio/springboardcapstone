// src/Login/RegisterPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import axiosInstance from "../axiosInstance";

// A simple regex to validate email format.
// This regex checks that the email has some characters, an @, and a domain.
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// A simple function to validate password complexity.
// Here we require the password to be at least 8 characters long.
const validatePassword = (password) => {
  return password.length >= 8;
};

function RegisterPage() {
  // We'll treat 'email' as the username for the backend.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Error messages for each field
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Overall message (e.g., success or error)
  const [message, setMessage] = useState("");

  const { setUser } = useUser();
  const navigate = useNavigate();

  // Validate email on change
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (!validateEmail(value)) {
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address." }));
    } else {
      setErrors((prev) => ({ ...prev, email: "" }));
    }
  };

  // Validate password on change
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (!validatePassword(value)) {
      setErrors((prev) => ({ ...prev, password: "Password must be at least 8 characters long." }));
    } else {
      setErrors((prev) => ({ ...prev, password: "" }));
    }
    // Also check if confirmPassword matches the new password.
    if (confirmPassword && value !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match." }));
    } else if (confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  // Validate confirm password on change
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (password !== value) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match." }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // If any validation errors exist, do not submit.
    if (errors.email || errors.password || errors.confirmPassword) {
      setMessage("Please fix the errors before submitting.");
      return;
    }

    // Check if fields are not empty
    if (!email || !password || !confirmPassword) {
      setMessage("All fields are required.");
      return;
    }

    // Ensure passwords match
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      const { data } = await axiosInstance.post("/api/users/register", {
        username: email,
        password,
      });
      if (data.success) {
        // Save the JWT token for subsequent API calls
        localStorage.setItem("token", data.token);
        setUser(data.user);
        // Redirect based on onboarding flag
        if (data.user.onboardingCompleted) {
          navigate("/schedule");
        } else {
          navigate("/calendar-onboarding");
        }
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Error registering user:", error);
      setMessage("An error occurred during registration.");
    }
  };

  return (
    <div
      style={{
        marginTop: "100px",
        display: "flex",
        justifyContent: "center",
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
        }}
      >
        <h2>Create an Account</h2>
        {message && <p style={{ color: "red" }}>{message}</p>}

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
              boxSizing: "border-box",
            }}
          />
          {errors.email && (
            <span style={{ color: "red", fontSize: "0.9rem" }}>{errors.email}</span>
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
              boxSizing: "border-box",
            }}
          />
          {errors.password && (
            <span style={{ color: "red", fontSize: "0.9rem" }}>{errors.password}</span>
          )}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            required
            style={{
              display: "block",
              width: "100%",
              padding: "0.5rem",
              boxSizing: "border-box",
            }}
          />
          {errors.confirmPassword && (
            <span style={{ color: "red", fontSize: "0.9rem" }}>{errors.confirmPassword}</span>
          )}
        </div>

        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Register
        </button>

        {/* Link to the Login Page */}
        <div style={{ marginTop: "1rem" }}>
          <p style={{ margin: 0 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#00e1ff" }}>
              Log in here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default RegisterPage;
