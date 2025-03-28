// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, Link } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { useUser } from "./UserContext";
import axiosInstance from "./axiosInstance";

import LoginPage from "./Login/LoginPage";
import RegisterPage from "./Login/RegisterPage";
import Schedule from "./Schedule/Schedule";
import PrivateRoute from "./PrivateRoute";

function App() {
  const { setUser } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const navigate = useNavigate();

  // State for the slide-out menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Check session on mount.
  useEffect(() => {
    async function checkSession() {
      try {
        const { data } = await axiosInstance.get("/api/users/me");
        if (data.success && data.user) {
          setUser(data.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsAuthChecked(true);
      }
    }
    checkSession();
  }, [setUser]);

  if (!isAuthChecked) {
    return <div>Loading...</div>;
  }

  // Logout function: clears token and resets state
  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuthenticated(false);
    navigate("/login");
  }

  // Toggle menu state
  function handleToggleMenu() {
    setMenuOpen(!menuOpen);
  }

  function handleCloseMenu() {
    setMenuOpen(false);
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Everything else is protected */}
      <Route
        path="*"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <div>
              {/* Header Bar */}
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
                  zIndex: 1000,
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

              {/* Slide-out Menu */}
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
                      zIndex: 999,
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
                      zIndex: 1000,
                      display: "flex",
                      flexDirection: "column",
                      padding: "1rem",
                      boxSizing: "border-box",
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
                    <button
                      onClick={() => {
                        handleCloseMenu();
                        handleLogout();
                      }}
                      style={{
                        marginTop: "auto",
                        color: "#fff",
                        background: "none",
                        border: "1px solid white",
                        padding: "0.4rem",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}

              {/* Main Protected Content with padding to avoid header overlap */}
              <div style={{ padding: "80px 1rem 1rem 1rem" }}>
                <Schedule />
              </div>
            </div>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
