// src/Login/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "../UserContext";
import axiosInstance from "../axiosInstance";

// A simple regex to validate email format.
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// A simple function to validate password complexity.
const validatePassword = (password) => {
  return password.length >= 8;
};

function LoginPage({ setIsAuthenticated }) {
  // We'll treat 'email' as the username, to match the backend "username" field.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Error messages for each field
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  // An overall message (e.g., login success or server error)
  const [message, setMessage] = useState("");
  const { setUser } = useUser();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
      setErrors((prev) => ({ ...prev, password: "Password must be at least 8 characters." }));
    } else {
      setErrors((prev) => ({ ...prev, password: "" }));
    }
  };

  // Submit handler for the login form
  const handleSubmit = async (e) => {
    e.preventDefault();

    // If there are any errors, don’t submit
    if (errors.email || errors.password) {
      setMessage("Please fix the errors before logging in.");
      return;
    }

    // Ensure fields are not empty
    if (!email || !password) {
      setMessage("All fields are required.");
      return;
    }

    try {
      const { data } = await axiosInstance.post("/api/users/login", {
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
        setMessage(data.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Error logging in:", error);
      setMessage("An error occurred during login.");
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
        <h2>Login</h2>
        {message && <p style={{ color: "red" }}>{message}</p>}

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email">Username (Email):</label>
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

        <button type="submit" style={{ padding: "0.5rem 1rem" }}>
          Login
        </button>

        {/* Link to the Registration Page */}
        <div style={{ marginTop: "1rem" }}>
          <p style={{ margin: 0 }}>
            Don’t have an account?{" "}
            <Link to="/register" style={{ color: "#00e1ff" }}>
              Register here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;
