// ------------------------------------------------------------------
// Module:    server.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Load environment, initialize DB connection, and start HTTP server.
// ------------------------------------------------------------------

/**
 * @module server.js
 * @description
 *   - Load environment variables
 *   - Initialize MongoDB connection via Mongoose
 *   - Create and start HTTP server for the Express app
 */

// ─────────────── Dependencies ───────────────

require("dotenv").config();  
// Load .env variables before any other module imports

const http     = require("http");
const app      = require("./app");          
const mongoose = require("./config/mongo"); 
// Requiring mongo config triggers mongoose.connect(…)

// ─────────────── Configuration ───────────────

const PORT = process.env.PORT || 5000;  
// Default to 5000 if PORT is not set

// ─────────────── HTTP Server ───────────────

const server = http.createServer(app);  
// Wrap Express app in a Node HTTP server

// ─────────── Database Connection ────────────

/**
 * Once Mongoose connection is open, start listening.
 */
mongoose.connection.once("open", () => {
  // Start server only after DB is ready
  server.listen(PORT, () => {
    console.info(`Server is listening on port ${PORT}`);  
    // INFO: Server ready to accept requests
  });
});

/**
 * Log any Mongoose connection errors.
 */
mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
  // ERROR: Investigate connection issues
});

module.exports = server;  
// Export server for integration tests or external control
