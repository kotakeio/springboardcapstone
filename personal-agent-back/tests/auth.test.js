// ------------------------------------------------------------------
// Module:    tests/auth.test.js
// Author:    John Gibson
// Created:   2025-04-21
// Purpose:   Defines tests for user authentication and profile endpoints.
// ------------------------------------------------------------------

/**
 * @module auth.test
 * @description
 *   - Configures dummy environment to prevent initialization errors.
 *   - Validates user registration, login, logout, profile retrieval, and timezone update endpoints.
 */

// ─────────────── Test Configuration ───────────────

// Increase Jest timeout for potentially slow asynchronous operations.
jest.setTimeout(70000);

// Set dummy environment variables to satisfy application initialization.
process.env.PHONE_ALARM_ENDPOINTS = "http://dummy.com";
process.env.SESSION_SECRET        = "dummySecret";
process.env.JWT_SECRET            = "dummyJwtSecret";
process.env.DB_HOST               = "dummyHost";
process.env.DB_USER               = "dummyUser";
process.env.DB_PASSWORD           = "dummyPassword";
process.env.DB_NAME               = "dummyDB";
process.env.DB_PORT               = "5432";
process.env.MONGO_URI             = "mongodb://localhost:27017/dummydb"; // Ensure MongoDB is running at this URI.
process.env.DATABASE_URL          = "postgres://dummyUser:dummyPassword@dummyHost:5432/dummyDB";

// ─────────────── Dependencies ───────────────

const request   = require("supertest");
const app       = require("../app");
const User      = require("../models/user");
const UserEmail = require("../models/userEmail");

// Test user credentials used across multiple suites.
const testUser = {
  username: "testuser@example.com",
  password: "TestPassword123",
};

// ─────────────── Test Suites ───────────────

/**
 * Test suite for Authentication and User Endpoints.
 */
describe("Authentication and User Endpoints", () => {

  /**
   * Clear user collections before each test to ensure test isolation.
   */
  beforeEach(async () => {
    await User.deleteMany({});
    await UserEmail.deleteMany({});
  });

  // ───── Register Endpoint Tests ─────

  describe("POST /api/users/register", () => {
    test("Valid registration returns token and user payload", async () => {
      const response = await request(app)
        .post("/api/users/register")
        .send(testUser);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUser.username);
    });

    test("Duplicate registration returns 400 error", async () => {
      await request(app).post("/api/users/register").send(testUser);

      const response = await request(app)
        .post("/api/users/register")
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/already registered/i);
    });

    test("Invalid email format returns 400 error", async () => {
      const response = await request(app)
        .post("/api/users/register")
        .send({ username: "invalidEmail", password: "TestPassword123" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test("Password too short returns 400 error", async () => {
      const response = await request(app)
        .post("/api/users/register")
        .send({ username: "newuser@example.com", password: "short" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ───── Login Endpoint Tests ─────

  describe("POST /api/users/login", () => {
    beforeEach(async () => {
      // Ensure user exists before login tests.
      await request(app).post("/api/users/register").send(testUser);
    });

    test("Valid login returns token and user payload", async () => {
      const response = await request(app)
        .post("/api/users/login")
        .send(testUser);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUser.username);
    });

    test("Invalid credentials return 401 error", async () => {
      const response = await request(app)
        .post("/api/users/login")
        .send({ username: testUser.username, password: "WrongPassword" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test("Missing fields return 400 error", async () => {
      const response = await request(app)
        .post("/api/users/login")
        .send({ username: testUser.username });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ───── Logout Endpoint Tests ─────

  describe("POST /api/users/logout", () => {
    let token;

    beforeEach(async () => {
      // Authenticate user to obtain a valid token.
      await request(app).post("/api/users/register").send(testUser);
      const loginRes = await request(app)
        .post("/api/users/login")
        .send(testUser);
      token = loginRes.body.token;
    });

    test("Authenticated logout returns success", async () => {
      const response = await request(app)
        .post("/api/users/logout")
        .set("Authorization", `Bearer ${token}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test("Unauthenticated logout returns 401 error", async () => {
      const response = await request(app)
        .post("/api/users/logout")
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ───── User Profile Endpoint Tests ─────

  describe("GET /api/users/me", () => {
    let token;

    beforeEach(async () => {
      await request(app).post("/api/users/register").send(testUser);
      const loginRes = await request(app)
        .post("/api/users/login")
        .send(testUser);
      token = loginRes.body.token;
    });

    test("Valid token returns user info", async () => {
      const response = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUser.username);
    });

    test("Missing token returns 401 error", async () => {
      const response = await request(app)
        .get("/api/users/me")
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ───── Timezone Update Endpoint Tests ─────

  describe("PUT /api/users/timezone", () => {
    let token;

    beforeEach(async () => {
      await request(app).post("/api/users/register").send(testUser);
      const loginRes = await request(app)
        .post("/api/users/login")
        .send(testUser);
      token = loginRes.body.token;
    });

    test("Valid timezone update returns updated user info", async () => {
      const response = await request(app)
        .put("/api/users/timezone")
        .set("Authorization", `Bearer ${token}`)
        .send({ timezone: "America/Denver" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.timezone).toBe("America/Denver");
      expect(response.body.user.onboardingCompleted).toBe(true);
    });

    test("Missing timezone returns 400 error", async () => {
      const response = await request(app)
        .put("/api/users/timezone")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});

// ─────────────── Test Teardown ───────────────

/**
 * Close the Mongoose connection after all tests complete.
 */
afterAll(async () => {
  const mongoose = require("mongoose");
  await mongoose.connection.close();
});
