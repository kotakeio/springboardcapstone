// src/UserContext.js
import React, { createContext, useState, useContext } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  // When a new user registers, set onboardingCompleted to false.
  const [user, setUser] = useState({
    // ... other user info,
    onboardingCompleted: false,
  });

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
