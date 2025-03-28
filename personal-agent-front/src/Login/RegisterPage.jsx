// src/Login/RegisterPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../UserContext";
import axiosInstance from "../axiosInstance";

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => password.length >= 8;

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const { setUser } = useUser();
  const navigate = useNavigate();

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setErrors((prev) => ({ ...prev, email: validateEmail(value) ? "" : "Invalid email." }));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setErrors((prev) => ({ ...prev, password: validatePassword(value) ? "" : "Password must be at least 8 characters." }));
    if (confirmPassword && value !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match." }));
    } else if (confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setErrors((prev) => ({ ...prev, confirmPassword: password !== value ? "Passwords do not match." : "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setMessage("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    try {
      const { data } = await axiosInstance.post("/api/users/register", { username: email, password });
      if (data.success) {
        localStorage.setItem("token", data.token);
        setUser(data.user);
        navigate("/schedule");
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Error registering user:", error);
      setMessage("An error occurred during registration.");
    }
  };

  return (
    <div style={{ marginTop: "100px", display: "flex", justifyContent: "center" }}>
      <form onSubmit={handleSubmit} noValidate style={{ border: "2px solid #888", padding: "1rem", borderRadius: "6px", backgroundColor: "#333", color: "#fff", minWidth: "300px" }}>
        <h2>Create an Account</h2>
        {message && <p style={{ color: "red" }}>{message}</p>}
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="email">Email:</label>
          <input type="email" id="email" value={email} onChange={handleEmailChange} required style={{ display: "block", width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
          {errors.email && <span style={{ color: "red", fontSize: "0.9rem" }}>{errors.email}</span>}
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="password">Password:</label>
          <input type="password" id="password" value={password} onChange={handlePasswordChange} required style={{ display: "block", width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
          {errors.password && <span style={{ color: "red", fontSize: "0.9rem" }}>{errors.password}</span>}
        </div>
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input type="password" id="confirmPassword" value={confirmPassword} onChange={handleConfirmPasswordChange} required style={{ display: "block", width: "100%", padding: "0.5rem", boxSizing: "border-box" }} />
          {errors.confirmPassword && <span style={{ color: "red", fontSize: "0.9rem" }}>{errors.confirmPassword}</span>}
        </div>
        <button type="submit" style={{ padding: "0.5rem 1rem" }}>Register</button>
        <div style={{ marginTop: "1rem" }}>
          <p style={{ margin: 0 }}>
            Already have an account? <Link to="/login" style={{ color: "#00e1ff" }}>Log in here</Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default RegisterPage;
