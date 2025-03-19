// routes/user.routes.js
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Import Mongoose models using capitalized names
const User = require("../models/user");
const UserEmail = require("../models/UserEmail");

const { isAuthenticated } = require("../middleware/auth");
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Helper validation functions
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
function validatePassword(password) {
  return password.length >= 8;
}

const router = express.Router();

// POST /api/users/register
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

    // Create new user with default timezone "UTC" and onboardingCompleted false
    const newUser = new User({
      username,
      passwordHash,
      timezone: "UTC",
      onboardingCompleted: false,
    });
    await newUser.save();

    // Create associated UserEmail record
    const newUserEmail = new UserEmail({
      email: username,
      isCalendarOnboarded: false,
      userId: newUser._id,
    });
    await newUserEmail.save();

    const payload = {
      _id: newUser._id,
      username: newUser.username,
      timezone: newUser.timezone,
      onboardingCompleted: newUser.onboardingCompleted,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      success: true,
      message: "Account created successfully!",
      token,
      user: payload,
    });
  } catch (err) {
    console.error("Error in register:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/login
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

    const payload = {
      _id: foundUser._id,
      username: foundUser.username,
      timezone: foundUser.timezone,
      onboardingCompleted: foundUser.onboardingCompleted,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      success: true,
      message: "Logged in",
      token,
      user: payload,
    });
  } catch (err) {
    console.error("Error in login:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/logout (protected)
// With JWT, there is no server-side session to destroy; the client should remove the token.
router.post("/logout", isAuthenticated, (req, res) => {
  return res.json({ success: true, message: "Logged out (remove token on client side)" });
});

// GET /api/users/calendarEmails
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

// POST /api/users/calendarEmails - create a new UserEmail record
router.post("/calendarEmails", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Missing email" });
    }
    const newEmail = new UserEmail({
      email,
      userId,
      isCalendarOnboarded: false,
    });
    await newEmail.save();
    return res.json({ success: true, userEmail: newEmail });
  } catch (err) {
    console.error("Error in POST /calendarEmails:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/calendarEmails/:emailId/verify - verify the email and set isCalendarOnboarded to true
router.post("/calendarEmails/:emailId/verify", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { emailId } = req.params;
    const userEmailRow = await UserEmail.findOne({ _id: emailId, userId });
    if (!userEmailRow) {
      return res.status(404).json({ success: false, message: "Email not found for this user" });
    }
    // For demonstration, assume verification is always successful.
    userEmailRow.isCalendarOnboarded = true;
    await userEmailRow.save();
    return res.json({ success: true, message: "Calendar verified", userEmail: userEmailRow });
  } catch (err) {
    console.error("Error in POST /calendarEmails/:emailId/verify:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/users/timezone - update user's timezone and mark onboarding as complete
router.put("/timezone", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const { timezone } = req.body;
    if (!timezone) {
      return res.status(400).json({ success: false, message: "Timezone is required" });
    }
    const userData = await User.findById(userId);
    if (!userData) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    userData.timezone = timezone;
    userData.onboardingCompleted = true;
    await userData.save();
    return res.json({
      success: true,
      message: "Timezone updated and onboarding complete",
      user: {
        _id: userData._id,
        username: userData.username,
        timezone: userData.timezone,
        onboardingCompleted: userData.onboardingCompleted,
      },
    });
  } catch (err) {
    console.error("Error updating timezone:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/users/me - returns the logged-in user's information
router.get("/me", isAuthenticated, (req, res) => {
  return res.json({ success: true, user: req.user });
});

module.exports = router;
