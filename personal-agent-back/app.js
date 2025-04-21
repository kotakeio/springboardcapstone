// ------------------------------------------------------------------
// Module:    app.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Sets up Express server, middleware, and API routes.
// ------------------------------------------------------------------

/**
 * @module app
 * @description
 *   - Configures Express application with CORS, JSON parsing, file uploads,
 *     and session management.
 *   - Mounts freedom-blocks and user routers under /api.
 *   - Serves React build in production.
 */

// ─────────────── Dependencies ───────────────
require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const fileUpload = require("express-fileupload");
const session    = require("express-session");
const path       = require("path");

// Determine production mode for security settings
const isProduction = process.env.NODE_ENV === 'production';

// Routers
const freedomRouter = require("./routes/freedom.routes");
const userRouter    = require("./routes/user.routes");

// ─────────────── App Initialization ───────────────
const app = express();

// ─────────────── CORS Configuration ───────────────
const allowedOrigins = [
  "http://localhost:5173",
  "https://springboardcapstone-bzjm.onrender.com"
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (e.g., mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// ─────────────── Middleware ───────────────
app.use(express.json());          // parse JSON request bodies
app.use(fileUpload());            // handle file uploads
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,                         // only send cookie over HTTPS in production
      httpOnly: true,                               // prevent client-side JS from reading the cookie
      sameSite: isProduction ? 'strict' : 'lax',     // strict in prod to mitigate CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000               // expire in one week
    }
  })
);

// ─────────────── API Routes ───────────────
app.use("/api/freedom-blocks", freedomRouter);
app.use("/api/users", userRouter);

// ─────────────── Root Handlers ───────────────
/**
 * Health check / welcome endpoint.
 * @route GET /
 * @returns {string} Simple greeting message
 */
app.get("/", (req, res) => {
  res.send("Hello from AI Agents Backend!");
});

// ─────────────── Production Static Serving ───────────────
if (isProduction) {
  // Serve React build artifacts
  app.use(express.static(path.join(__dirname, "build")));

  /**
   * Catch-all handler: for any requests that don't match an API route,
   * serve React's index.html to allow client-side routing.
   * @route GET *
   */
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

// ─────────────── Exports ───────────────
module.exports = app;
