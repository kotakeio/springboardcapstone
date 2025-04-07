// tests/freedomBlocks.test.js

jest.setTimeout(70000); // Increase timeout for slow operations

// Set up dummy environment variables.
process.env.PHONE_ALARM_ENDPOINTS = "http://dummy.com";
process.env.SESSION_SECRET = "dummySecret";
process.env.JWT_SECRET = "dummyJwtSecret";
process.env.DB_HOST = "dummyHost";
process.env.DB_USER = "dummyUser";
process.env.DB_PASSWORD = "dummyPassword";
process.env.DB_NAME = "dummyDB";
process.env.DB_PORT = "5432";
process.env.MONGO_URI = "mongodb://localhost:27017/dummydb";
process.env.DATABASE_URL = "postgres://dummyUser:dummyPassword@dummyHost:5432/dummyDB";

jest.mock("../services/calendar/appointments.service", () => {
    // Import dayjs and its plugins inside the factory.
    const dayjs = require("dayjs");
    const utc = require("dayjs/plugin/utc");
    const timezone = require("dayjs/plugin/timezone");
    dayjs.extend(utc);
    dayjs.extend(timezone);
  
    return {
      getBusyTimesUntil: jest.fn(async (calendarIds, endTime) => ({
        now: dayjs().tz("America/Denver"),
        busyArray: []
      })),
      listAppointments: jest.fn(async (calendarId, timeMin, timeMax) => {
        return []; // no appointments
      })
    };
  });

// For phone alarms, we simply resolve without error.
jest.mock("../services/phoneAlarm.service", () => ({
  setPhoneAlarm: jest.fn(async (time) => {
    return; // do nothing
  })
}));

const request = require("supertest");
const app = require("../app");

// Import Mongoose models for test setup and cleanup.
const FreedomTimeBlock = require("../models/freedomTimeBlocks");
const User = require("../models/user");
const UserEmail = require("../models/userEmail");

// Define a test user for authentication.
const testUser = {
  username: "testfreedom@example.com",
  password: "TestPassword123",
};

let token; // Will hold the JWT token for authenticated requests.

// Before each test, clear all relevant collections and set up a fresh test user with verified email.
beforeEach(async () => {
  const User = require("../models/user");
  const UserEmail = require("../models/userEmail");
  const FreedomTimeBlock = require("../models/freedomTimeBlocks");

  // Clear collections.
  await User.deleteMany({});
  await UserEmail.deleteMany({});
  await FreedomTimeBlock.deleteMany({});

  // Register the test user.
  await request(app).post("/api/users/register").send(testUser);
  const loginRes = await request(app).post("/api/users/login").send(testUser);
  token = loginRes.body.token;
  const user = await User.findOne({ username: testUser.username });

  // Update the existing UserEmail document to mark it as verified.
  await UserEmail.findOneAndUpdate(
    { email: testUser.username },
    { isCalendarOnboarded: true, userId: user._id },
    { new: true }
  );
});

// After each test, clear the FreedomTimeBlock collection.
afterEach(async () => {
  await FreedomTimeBlock.deleteMany({});
});

describe("Freedom Blocks Endpoints", () => {

  describe("POST /api/freedom-blocks", () => {
    test("Creates freedom time blocks when verified emails exist", async () => {
      const res = await request(app)
        .post("/api/freedom-blocks")
        .set("Authorization", `Bearer ${token}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // The response should include a blocks array and indicate verified emails.
      expect(res.body.verified).toBe(true);
      expect(res.body.blocks).toBeDefined();
    });
  });

  describe("GET /api/freedom-blocks/today", () => {
    test("Returns today's schedule with time blocks and appointments", async () => {
      const res = await request(app)
        .get("/api/freedom-blocks/today")
        .set("Authorization", `Bearer ${token}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verified).toBe(true);
      expect(Array.isArray(res.body.timeBlocks)).toBe(true);
      expect(Array.isArray(res.body.appointments)).toBe(true);
    });
  });

  describe("PUT /api/freedom-blocks/:id", () => {
    let block;
    beforeEach(async () => {
      // Create a test block.
      block = await FreedomTimeBlock.create({
        startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        approved: false,
      });
    });
    test("Updates a freedom block with valid times", async () => {
      // New start/end times in ISO string format.
      const newStart = new Date(Date.now() + 90 * 60 * 1000).toISOString();
      const newEnd = new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .put(`/api/freedom-blocks/${block._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ startTime: newStart, endTime: newEnd });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.block).toBeDefined();
    });
    test("Returns 404 if block not found", async () => {
      const nonExistentId = "645bca9f4e8b9a0012345678";
      const newStart = new Date(Date.now() + 90 * 60 * 1000).toISOString();
      const newEnd = new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .put(`/api/freedom-blocks/${nonExistentId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ startTime: newStart, endTime: newEnd });
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/freedom-blocks/approveAll", () => {
    beforeEach(async () => {
      // Create two unapproved blocks.
      await FreedomTimeBlock.create([
        {
          startTime: new Date(Date.now() + 60 * 60 * 1000),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          approved: false,
        },
        {
          startTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
          approved: false,
        }
      ]);
    });
    test("Approves all blocks and returns success message", async () => {
      const res = await request(app)
        .post("/api/freedom-blocks/approveAll")
        .set("Authorization", `Bearer ${token}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Approved \d+ blocks/);
      // Verify that blocks in the DB are now approved.
      const blocks = await FreedomTimeBlock.find({});
      blocks.forEach(b => {
        expect(b.approved).toBe(true);
      });
    });
  });

  describe("DELETE /api/freedom-blocks/:id", () => {
    let block;
    beforeEach(async () => {
      block = await FreedomTimeBlock.create({
        startTime: new Date(Date.now() + 60 * 60 * 1000),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        approved: false,
      });
    });
    test("Deletes a block successfully", async () => {
      const res = await request(app)
        .delete(`/api/freedom-blocks/${block._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const deleted = await FreedomTimeBlock.findById(block._id);
      expect(deleted).toBeNull();
    });
    test("Returns 404 when deleting a non-existent block", async () => {
      const nonExistentId = "645bca9f4e8b9a0012345678";
      const res = await request(app)
        .delete(`/api/freedom-blocks/${nonExistentId}`)
        .set("Authorization", `Bearer ${token}`)
        .send();
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/freedom-blocks/:id/phoneAlarm", () => {
    let block;
    beforeEach(async () => {
      block = await FreedomTimeBlock.create({
        startTime: new Date(Date.now() + 60 * 60 * 1000),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        approved: false,
      });
    });
    test("Sets phone alarm successfully", async () => {
      const res = await request(app)
        .post(`/api/freedom-blocks/${block._id}/phoneAlarm`)
        .set("Authorization", `Bearer ${token}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/Alarm set for block/);
    });
    test("Returns 404 for non-existent block", async () => {
      const nonExistentId = "645bca9f4e8b9a0012345678";
      const res = await request(app)
        .post(`/api/freedom-blocks/${nonExistentId}/phoneAlarm`)
        .set("Authorization", `Bearer ${token}`)
        .send();
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/freedom-blocks/:id/taskMagic", () => {
    let block;
    beforeEach(async () => {
      block = await FreedomTimeBlock.create({
        startTime: new Date(Date.now() + 60 * 60 * 1000),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        approved: false,
      });
    });
    test("Triggers TaskMagic and returns webhook response", async () => {
      // Set a dummy webhook URL.
      process.env.FREEDOM_APP_TASKMAGIC_WEBHOOK = "http://dummy-webhook.com";
      // Mock the global fetch function to simulate a successful webhook call.
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => "Dummy webhook response",
      }));
      const res = await request(app)
        .post(`/api/freedom-blocks/${block._id}/taskMagic`)
        .set("Authorization", `Bearer ${token}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.webhookResponse).toBe("Dummy webhook response");
    });
    test("Returns 404 for non-existent block", async () => {
      const nonExistentId = "645bca9f4e8b9a0012345678";
      const res = await request(app)
        .post(`/api/freedom-blocks/${nonExistentId}/taskMagic`)
        .set("Authorization", `Bearer ${token}`)
        .send();
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

});

// Note: We rely on the global teardown (jest.teardown.js) to disconnect Mongoose and stop the in-memory MongoDB.
