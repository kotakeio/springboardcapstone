// src/App.jsx
import React, { useState, useEffect } from "react";
import {Routes, Route, Link,} from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { useUser } from "./UserContext";

import LoginPage from "./Login/LoginPage";
import RegisterPage from "./Login/RegisterPage"; // New RegisterPage for account creation
import Home from "./home";
import Schedule from "./Schedule/Schedule";
import PrivateRoute from "./PrivateRoute"; // Your existing auth-protection wrapper
import CalendarOnboarding from "./Login/CalendarOnboarding";
import { RequireOnboarding } from "./RequireOnboarding"; // New route wrapper for onboarding check
import TimezonePage from "./Login/TimezonePage";  // <-- new page
import axiosInstance from "./axiosInstance"; // Axios instance that attaches your JWT token

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { user, setUser } = useUser();

  const [isAuthChecked, setIsAuthChecked] = useState(false);

useEffect(() => {
  async function checkSession() {
    try {
      const { data } = await axiosInstance.get("/api/users/me");
      if (data.success && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setIsAuthChecked(true);
    }
  }
  checkSession();
}, [setUser]);

// Prevent rendering until auth check is complete
if (!isAuthChecked) {
  return <div>Loading...</div>; 
}


  function handleToggleMenu() {
    setMenuOpen(!menuOpen);
  }

  // Close the slide-out menu when clicking the overlay
  function handleCloseMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      {/* Top header bar */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          backgroundColor: "#333",
          padding: "0 1rem",
          boxSizing: "border-box",
          zIndex: 999999,
        }}
      >
        <button
          onClick={handleToggleMenu}
          style={{
            background: "none",
            border: "1px solid white",
            padding: "0.4rem",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "1.5rem",
            cursor: "pointer",
          }}
        >
          <FaBars />
        </button>
      </header>

      {/* Slide-out menu */}
      {menuOpen && (
        <>
          <div
            onClick={handleCloseMenu}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 998,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "200px",
              height: "100vh",
              backgroundColor: "#222",
              zIndex: 999,
              display: "flex",
              flexDirection: "column",
              padding: "1rem",
              boxSizing: "border-box",
              transform: "translateX(0%)",
              transition: "transform 0.3s ease-in-out",
            }}
          >
            <button
              onClick={handleCloseMenu}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: "1rem",
                marginBottom: "1rem",
                alignSelf: "flex-end",
                cursor: "pointer",
              }}
            >
              Close ✕
            </button>
            <Link
              to="/schedule"
              style={{ color: "#fff", textDecoration: "none", marginBottom: 10 }}
              onClick={handleCloseMenu}
            >
              Schedule
            </Link>
          </div>
        </>
      )}

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Private + Onboarding Routes */}
        <Route
          path="/calendar-onboarding"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <CalendarOnboarding />
            </PrivateRoute>
          }
        />
        <Route
          path="/timezone-setup"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <TimezonePage />
            </PrivateRoute>
          }
        />

        {/* “Main” app routes that also require onboarding */}
        <Route
          path="/"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <RequireOnboarding>
                <Home />
              </RequireOnboarding>
            </PrivateRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <PrivateRoute isAuthenticated={isAuthenticated}>
              <RequireOnboarding>
                <Schedule />
              </RequireOnboarding>
            </PrivateRoute>
          }
        />
      </Routes>

    </>
  );
}

export default App;
