// ------------------------------------------------------------------
// Module:    jest.teardown.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Disconnect mongoose and stop the in-memory MongoDB server after tests.
// ------------------------------------------------------------------

/**
 * @module jest.teardown
 * @description
 *   - Disconnects mongoose from the test database.
 *   - Stops the global MongoMemoryServer instance if it exists.
 */

const mongoose = require("mongoose");

// ─────────────── Teardown Function ───────────────

/**
 * Gracefully disconnects Mongoose and shuts down the in-memory MongoDB server.
 *
 * @async
 * @function
 * @returns {Promise<void>}
 */
module.exports = async () => {
  // Disconnect Mongoose from any open connections.
  await mongoose.disconnect();

  // If the global in-memory server is running, stop it to free resources.
  if (global.__MONGO_SERVER__ && typeof global.__MONGO_SERVER__.stop === "function") {
    await global.__MONGO_SERVER__.stop();
  }
};
