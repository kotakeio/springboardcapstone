// ------------------------------------------------------------------
// Module:    middleware/auth.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Express middleware for JWT authentication.
// ------------------------------------------------------------------

/**
 * @module middleware/auth.js
 * @description
 *   Provides an Express middleware to authenticate incoming
 *   requests via JWT in the Authorization header.
 */

// ─────── Dependencies ───────
const jwt = require("jsonwebtoken");

// ─────── Constants ───────
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
// TODO(jgibson): Move JWT_SECRET into a secure environment variable for production.

// ─────── Middleware ───────
/**
 * Validate the JSON Web Token provided in the Authorization header.
 *
 * Sends a 401 JSON response if:
 *   - No Authorization header is present.
 *   - Header format is not "Bearer <token>".
 *   - Token verification fails.
 * Otherwise attaches the decoded payload to `req.user` and calls `next()`.
 *
 * @param {import("express").Request} req   Incoming Express request.
 * @param {import("express").Response} res  Express response object.
 * @param {import("express").NextFunction} next Callback to pass control.
 * @returns {void}
 */
function isAuthenticated(req, res, next) {
  // Authorization header should be in "Bearer <token>" format.
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "No token provided."
    });
  }

  // Extract JWT (position 1) from the header.
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Invalid token format."
    });
  }

  // Verify JWT signature and expiration.
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: "Token is not valid."
      });
    }
    // Attach user payload for downstream handlers.
    req.user = decoded;
    next();
  });
}

// ─────── Exports ───────
module.exports = {
  isAuthenticated
};
