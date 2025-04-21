// ------------------------------------------------------------------
// Module:    jest.setup.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Sets up an in-memory MongoDB instance and connects
//            Mongoose for running Jest tests without an external DB.
// ------------------------------------------------------------------

/**
 * @module jest.setup
 * @description
 *   Initializes an in-memory MongoDB server using mongodb-memory-server
 *   and configures Mongoose to connect to it for isolated testing.
 */

// ─────────────── Dependencies ───────────────
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose             = require("mongoose");

let mongoServer;

// ─────────────── Setup Function ───────────────

/**
 * Start an in-memory MongoDB instance and connect Mongoose.
 *
 * @returns {Promise<void>} Resolves when the in-memory server is running
 *   and Mongoose is connected.
 * @throws {Error} If MongoMemoryServer fails to start or Mongoose fails
 *   to establish a connection.
 */
module.exports = async () => {
  // Create and start MongoMemoryServer for testing isolation.
  mongoServer = await MongoMemoryServer.create();

  // Retrieve the connection URI for the in-memory server.
  const uri = mongoServer.getUri();

  // Override environment variable so app code uses this URI.
  process.env.MONGO_URI = uri;

  // Establish Mongoose connection using the in-memory URI.
  await mongoose.connect(uri);

  // Expose server instance for teardown in Jest global scope.
  global.__MONGO_SERVER__ = mongoServer;
};
