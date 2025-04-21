// ------------------------------------------------------------------
// Module:    src/App.jsx
// Author:    John Gibson
// Created:   2025‑04‑21
// Purpose:   Main application component: handles authentication,
//            routing (public & protected), and slide‑out menu.
// ------------------------------------------------------------------

/**
 * @module App
 * @description
 *   - Checks user session on mount and sets auth state.
//    - Defines public routes (/login, /register).
 *   - Protects /schedule behind `PrivateRoute`.
 *   - Renders a fixed header with toggleable slide‑out menu.
 */

import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  Link
} from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { useUser } from "./UserContext";
import axiosInstance from "./axiosInstance";

import LoginPage    from "./Login/LoginPage";
import RegisterPage from "./Login/RegisterPage";
import Schedule     from "./Schedule/Schedule";
import PrivateRoute from "./PrivateRoute";
import TourGuide    from "./TourGuide";

// ─────────────── App Component ───────────────

/**
 * Top‑level application component.
 *
 * @returns {JSX.Element} The application router and layout.
 */
function App() {
  const { setUser } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecked, setIsAuthChecked]           = useState(false);
  const [menuOpen, setMenuOpen]                     = useState(false);
  const navigate = useNavigate();

  // ─── Check session on mount ───
  useEffect(() => {
    async function checkSession() {
      try {
        const { data } = await axiosInstance.get("/api/users/me");
        // If we have a valid user ID, mark as authenticated
        if (data.success && data.user && data.user._id) {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          // No valid session → clear token and auth state
          localStorage.removeItem("token");
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        // Network or API error → clear token and auth state
        localStorage.removeItem("token");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        // Always mark that auth check is complete
        setIsAuthChecked(true);
      }
    }
    checkSession();
  }, [setUser]);

  if (!isAuthChecked) {
    return <div>Loading Agents...</div>;
  }

  // ─── Handlers ───

  /**
   * Logout user: clear token, reset user & auth state,
   * and redirect to login.
   */
  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuthenticated(false);
    navigate("/login");
  }

  /**
   * Toggle slide‑out menu open/closed.
   */
  function handleToggleMenu() {
    setMenuOpen(open => !open);
  }

  /**
   * Close slide‑out menu.
   */
  function handleCloseMenu() {
    setMenuOpen(false);
  }

  // ─── Render Routes & Layout ───
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Schedule Route */}
      <Route
        path="/schedule"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <div>
              {/* Header Bar */}
              <header
                style={{
                  position:      "fixed",
                  top:           0,
                  left:          0,
                  right:         0,
                  height:        "60px",
                  display:       "flex",
                  alignItems:    "center",
                  justifyContent:"flex-end",
                  backgroundColor:"#333",
                  padding:       "0 1rem",
                  boxSizing:     "border-box",
                  zIndex:        1000
                }}
              >
                <button
                  onClick={handleToggleMenu}
                  style={{
                    background:    "none",
                    border:        "1px solid white",
                    padding:       "0.4rem",
                    borderRadius:  "6px",
                    color:         "#fff",
                    fontSize:      "1.5rem",
                    cursor:        "pointer"
                  }}
                >
                  <FaBars />
                </button>
              </header>

              {/* Slide‑out Menu */}
              {menuOpen && (
                <>
                  {/* Overlay to close menu on click */}
                  <div
                    onClick={handleCloseMenu}
                    style={{
                      position:       "fixed",
                      top:            0,
                      left:           0,
                      width:          "100vw",
                      height:         "100vh",
                      backgroundColor:"rgba(0, 0, 0, 0.5)",
                      zIndex:         999
                    }}
                  />
                  {/* Menu panel */}
                  <div
                    style={{
                      position:       "fixed",
                      top:            0,
                      right:          0,
                      width:          "200px",
                      height:         "100vh",
                      backgroundColor:"#222",
                      zIndex:         1000,
                      display:        "flex",
                      flexDirection:  "column",
                      padding:        "1rem",
                      boxSizing:      "border-box",
                      transition:     "transform 0.3s ease-in-out"
                    }}
                  >
                    <button
                      onClick={handleCloseMenu}
                      style={{
                        background:    "none",
                        border:        "none",
                        color:         "#fff",
                        fontSize:      "1rem",
                        marginBottom:  "1rem",
                        alignSelf:     "flex-end",
                        cursor:        "pointer"
                      }}
                    >
                      Close ✕
                    </button>
                    <Link
                      to="/schedule"
                      onClick={handleCloseMenu}
                      style={{
                        color:         "#fff",
                        textDecoration:"none",
                        marginBottom:  10
                      }}
                    >
                      Schedule
                    </Link>
                    <button
                      onClick={() => {
                        handleCloseMenu();
                        handleLogout();
                      }}
                      style={{
                        marginTop:    "auto",
                        color:        "#fff",
                        background:   "none",
                        border:       "1px solid white",
                        padding:      "0.4rem",
                        borderRadius: "6px",
                        cursor:       "pointer"
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}

              {/* Main Protected Content */}
              {/* Padding avoids overlap with fixed header */}
              <div style={{ padding: "80px 1rem 1rem 1rem" }}>
                <Schedule />
              </div>
            </div>
          </PrivateRoute>
        }
      />

      {/* Redirect root to /schedule */}
      <Route path="/" element={<Navigate to="/schedule" replace />} />

      {/* Catch‑all 404 */}
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  );
}

export default App;
