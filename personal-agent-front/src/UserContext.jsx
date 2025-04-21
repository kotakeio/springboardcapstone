// ------------------------------------------------------------------
// Module:    src/UserContext.jsx
// Author:    John Gibson
// Created:   2025‑04‑21
// Purpose:   Provides React context for global user state management.
// ------------------------------------------------------------------

/**
 * @module UserContext
 * @description
 *   - Creates and provides a React context for global user state.
 *   - Exposes a hook for accessing and updating the current user.
 */

// ─────────────── Dependencies ───────────────
import React, { createContext, useState, useContext } from "react";

// ─────────────── Context Setup ───────────────
const UserContext = createContext();

// ─────────────── Providers ───────────────

/**
 * UserProvider wraps the application and supplies user state.
 *
 * @param {{children: React.ReactNode}} props
 *   - children: React components that need access to user context.
 * @returns {JSX.Element} A Context.Provider with user and setUser.
 */
export function UserProvider({ children }) {
  // Initialize user as null until a session check or login occurs.
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

// ─────────────── Hooks ───────────────

/**
 * useUser provides access to the user context.
 *
 * @returns {{ user: object|null, setUser: Function }}
 *   - user: the current user object or null if not logged in.
 *   - setUser: function to update the user state.
 */
export function useUser() {
  return useContext(UserContext);
}
