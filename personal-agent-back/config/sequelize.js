// ------------------------------------------------------------------
// Module:    config/sequelize.js
// Author:    John Gibson
// Created:   2025‑04‑21
// Purpose:   Initialize and configure Sequelize connection to PostgreSQL.
// ------------------------------------------------------------------

/**
 * @module config/sequelize
 * @description
 *   - Loads environment variables from `.env`.
 *   - Instantiates Sequelize with appropriate SSL options.
 *   - Tests the database connection on startup and logs errors.
 */

// ─────────── Dependencies ───────────
const { Sequelize } = require('sequelize');
require('dotenv').config();

// ─────────── Configuration ───────────
/**
 * @constant
 * @type {boolean}
 * @description
 *   True in production to enable SSL for Postgres connections.
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * @constant
 * @type {Sequelize}
 * @description
 *   Sequelize instance configured with DATABASE_URL and SSL options.
 */
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: isProduction
      ? {
          require: true,
          // allow self‑signed certificates in production environments
          rejectUnauthorized: false
        }
      : false
  }
});

// ─────────── Connection Test ───────────
sequelize.authenticate()
  .catch(error => {
    // Only log errors to avoid noisy debug output on successful connect
    console.error('Unable to connect to the database:', error);
  });

// ─────────── Export ───────────
module.exports = sequelize;
