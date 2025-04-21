// ------------------------------------------------------------------
// Module:    app.test.js
// Author:    John Gibson
// Created:   2025‑04‑21
// Purpose:   Test suite for verifying the root endpoint of the AI Agents Backend.
// ------------------------------------------------------------------

/**
 * @module app.test
 * @description
 *   - Configures environment variables for test isolation.
 *   - Validates that the GET / endpoint responds with the expected welcome message.
 */

// ─────────────── Environment Setup ───────────────

process.env.PHONE_ALARM_ENDPOINTS = "http://dummy.com";
process.env.SESSION_SECRET         = "dummySecret";
process.env.JWT_SECRET             = "dummyJwtSecret";
process.env.DB_HOST                = "dummyHost";
process.env.DB_USER                = "dummyUser";
process.env.DB_PASSWORD            = "dummyPassword";
process.env.DB_NAME                = "dummyDB";
process.env.DB_PORT                = "5432";
process.env.MONGO_URI              = "mongodb://localhost:27017/dummydb";
process.env.DATABASE_URL           = "postgres://dummyUser:dummyPassword@dummyHost:5432/dummyDB";

// ─────────────── Dependencies ───────────────

const request = require("supertest");
const app     = require("../app");

// ─────────────── Test Suites ───────────────

/**
 * Main application endpoint tests.
 */
describe("App", () => {
  /**
   * Verify that a GET request to `/` returns a 200 status
   * and includes the welcome message.
   *
   * @returns {Promise<void>}
   */
  test("GET / should return a welcome message", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("Hello from AI Agents Backend!");
  });
});
