// ------------------------------------------------------------------
// Module:    routes/user.routes.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Defines user auth, calendar email management, timezone update,
//            and profile endpoints using JWT & Express.
// ------------------------------------------------------------------

/**
 * @module UserRoutes
 * @description
 *   - User registration, login, and logout via JWT.
 *   - CRUD operations for calendar emails and their verification.
 *   - Timezone updates and profile retrieval.
 */

const express = require("express");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const UserEmail = require("../models/userEmail");
const { isAuthenticated } = require("../middleware/auth");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// ─────────────── Helper Functions ───────────────

/**
 * Validate email format.
 * @param {string} email  The email to validate.
 * @returns {boolean}     True if email matches pattern.
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password length.
 * @param {string} password  The password to validate.
 * @returns {boolean}        True if password is at least 8 characters.
 */
function validatePassword(password) {
  return password.length >= 8;
}

const router = express.Router();

// ─────────────── Routes ───────────────

/**
 * Register a new user.
 * @route POST /api/users/register
 * @param {object} req.body.username   User's email as username.
 * @param {object} req.body.password   User's plaintext password.
 * @returns {object}                   JSON with token and user payload.
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Missing email or password" });
    }
    if (!validateEmail(username)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with default settings
    const newUser = new User({ username, passwordHash, timezone: "UTC", onboardingCompleted: false });
    await newUser.save();

    // Associate a calendar email record
    const newUserEmail = new UserEmail({ email: username, isCalendarOnboarded: false, userId: newUser._id });
    await newUserEmail.save();

    const payload = { _id: newUser._id, username: newUser.username, timezone: newUser.timezone, onboardingCompleted: newUser.onboardingCompleted };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ success: true, message: "Account created successfully!", token, user: payload });
  } catch (err) {
    console.error("Error in register:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Authenticate an existing user.
 * @route POST /api/users/login
 * @param {object} req.body.username
 * @param {object} req.body.password
 * @returns {object}               JSON with token and user payload.
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Missing email or password" });
    }
    if (!validateEmail(username)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const foundUser = await User.findOne({ username });
    if (!foundUser) {
      return res.status(401).json({ success: false, message: "Invalid credentials (user not found)" });
    }

    const passwordValid = await bcrypt.compare(password, foundUser.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials (password mismatch)" });
    }

    const payload = { _id: foundUser._id, username: foundUser.username, timezone: foundUser.timezone, onboardingCompleted: foundUser.onboardingCompleted };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ success: true, message: "Logged in", token, user: payload });
  } catch (err) {
    console.error("Error in login:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Logout a user (client should discard JWT).
 * @route POST /api/users/logout
 */
router.post("/logout", isAuthenticated, (req, res) => {
  return res.json({ success: true, message: "Logged out (remove token on client side)" });
});

/**
 * Get all calendar emails for the authenticated user.
 * @route GET /api/users/calendarEmails
 * @returns {object} emails array sorted by creation date.
 */
router.get("/calendarEmails", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const emails = await UserEmail.find({ userId }).sort({ createdAt: 1 });
    return res.json({ success: true, emails });
  } catch (err) {
    console.error("Error in GET /calendarEmails:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Add a new calendar email record.
 * @route POST /api/users/calendarEmails
 * @param {object} req.body.email  Email to onboard.
 * @returns {object}               Created UserEmail document.
 */
router.post("/calendarEmails", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Missing email" });
    }
    const newEmail = new UserEmail({ email, userId, isCalendarOnboarded: false });
    await newEmail.save();
    return res.json({ success: true, userEmail: newEmail });
  } catch (err) {
    console.error("Error in POST /calendarEmails:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Verify a calendar email by querying Google FreeBusy.
 * @route POST /api/users/calendarEmails/:emailId/verify
 * @param {string} req.params.emailId  ID of UserEmail record.
 * @returns {object}                   Verification result and updated record.
 */
router.post("/calendarEmails/:emailId/verify", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { emailId } = req.params;
    const userEmailRow = await UserEmail.findOne({ _id: emailId, userId });
    if (!userEmailRow) {
      return res.status(404).json({ success: false, message: "Email not found for this user" });
    }

    const { createCalendarClient } = require("../services/calendar/calendarAuth.service");
    const calendar = createCalendarClient();

    // Test access window: now → 24h
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const requestBody = { timeMin: now, timeMax: tomorrow, items: [{ id: userEmailRow.email }] };

    let apiResponse;
    try {
      apiResponse = await calendar.freebusy.query({ requestBody });
      // Removed debug console.log
    } catch (apiErr) {
      console.error("freeBusy query error:", apiErr);
      return res.status(400).json({ success: false, message: `Verification failed: calendar access error for ${userEmailRow.email}.` });
    }

    const calendarInfo = apiResponse.data.calendars?.[userEmailRow.email];
    if (!calendarInfo) {
      return res.status(400).json({ success: false, message: `Verification failed: No calendar data returned for ${userEmailRow.email}.` });
    }
    if (calendarInfo.errors) {
      console.error("Calendar info errors:", calendarInfo.errors);
      return res.status(400).json({ success: false, message: `Verification failed for ${userEmailRow.email}: ${JSON.stringify(calendarInfo.errors)}` });
    }
    if (Array.isArray(calendarInfo.busy)) {
      userEmailRow.isCalendarOnboarded = true;
      await userEmailRow.save();
      return res.json({ success: true, message: "Calendar verified", userEmail: userEmailRow });
    } else {
      return res.status(400).json({ success: false, message: `Verification failed for ${userEmailRow.email}: Unexpected calendar data format.` });
    }
  } catch (err) {
    console.error("Error in POST /calendarEmails/:emailId/verify:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Delete a calendar email record.
 * @route DELETE /api/users/calendarEmails/:emailId
 * @param {string} req.params.emailId
 * @returns {object}               Deletion confirmation.
 */
router.delete("/calendarEmails/:emailId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { emailId } = req.params;
    const userEmailRow = await UserEmail.findOne({ _id: emailId, userId });
    if (!userEmailRow) {
      return res.status(404).json({ success: false, message: "Email not found for this user" });
    }
    await userEmailRow.deleteOne();
    return res.json({ success: true, message: "Email deleted" });
  } catch (err) {
    console.error("Error in DELETE /calendarEmails/:emailId:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Update user's timezone and complete onboarding.
 * @route PUT /api/users/timezone
 * @param {string} req.body.timezone
 * @returns {object}               Updated user payload.
 */
router.put("/timezone", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { timezone } = req.body;
    if (!timezone) {
      return res.status(400).json({ success: false, message: "Timezone is required" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    user.timezone = timezone;
    user.onboardingCompleted = true;
    await user.save();
    return res.json({ success: true, message: "Timezone updated and onboarding complete", user: { _id: user._id, username: user.username, timezone: user.timezone, onboardingCompleted: user.onboardingCompleted } });
  } catch (err) {
    console.error("Error updating timezone:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Retrieve the authenticated user's profile.
 * @route GET /api/users/me
 * @returns {object}               User document.
 */
router.get("/me", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.json({ success: true, user });
  } catch (err) {
    console.error("Error in GET /me:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
