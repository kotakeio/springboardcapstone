// ------------------------------------------------------------------
// Module:    config/db.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Initialize and export a PostgreSQL connection pool.
// ------------------------------------------------------------------

/**
 * @module config/db
 * @description
 *   - Loads environment variables.
 *   - Configures and exports a pg.Pool instance for database queries.
 */

// ─────────────────────────────────────────────────────────────────
// Dependencies
// ─────────────────────────────────────────────────────────────────

require('dotenv').config(); // Load environment variables from .env.

const { Pool } = require('pg'); // Import the Pool constructor from pg.

// ─────────────────────────────────────────────────────────────────
// DB Pool Setup
// ─────────────────────────────────────────────────────────────────

/**
 * PostgreSQL connection pool configured via environment variables.
 *
 * @type {import('pg').Pool}
 */
const pool = new Pool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     process.env.DB_PORT,
});

// ─────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────

/**
 * Exported pg.Pool instance for executing database queries.
 */
module.exports = pool;
