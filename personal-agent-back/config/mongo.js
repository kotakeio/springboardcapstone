// ------------------------------------------------------------------
// Module:    config/mongo.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Establishes and exports a connection to MongoDB via Mongoose.
// ------------------------------------------------------------------

/**
 * @module config/mongo
 * @description
 *   - Loads environment variables from a .env file.
 *   - Establishes a Mongoose connection to the MongoDB instance.
 *   - Exports the connected Mongoose instance for use in other modules.
 */

// ─────────────── Dependencies ───────────────
const mongoose = require('mongoose');
require('dotenv').config(); // Load environment variables from .env.

// ─────────────── Connection Logic ───────────────
mongoose
  .connect(process.env.MONGO_URI)                // No more deprecated flags here
  .then(() => {
    console.log('MongoDB successfully connected');  // Optional: confirm connection
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// ─────────────── Export ───────────────
module.exports = mongoose;
