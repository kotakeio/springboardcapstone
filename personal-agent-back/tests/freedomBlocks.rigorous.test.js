// ------------------------------------------------------------------
// Module:    tests/freedomBlocks.rigorous.test.js
// Author:    John Gibson
// Created:   2025‑04‑21
// Purpose:   Rigorous tests for editing, regeneration, and deletion
//            of freedom time blocks with manual and approved overrides.
// ------------------------------------------------------------------

/**
 * Suite: Rigorous Freedom Blocks Editing and Regeneration Tests
 *
 * Validates that:
 *   1. Shortening a manual block creates a leftover excluded block.
 *   2. Auto‑regeneration respects manual and approved blocks.
 *   3. Excluded blocks are neither displayed nor regenerated.
 *
 * Note:
 *   Requires an in‑memory MongoDB instance via Jest setup/teardown.
 */

// ─────────────── Environment & Mocks ───────────────

// Inject dummy secrets so session & JWT work
process.env.SESSION_SECRET         = "dummySecret";
process.env.JWT_SECRET             = "dummyJwtSecret";
process.env.PHONE_ALARM_ENDPOINTS  = "http://dummy-alarm-endpoint.com";

// Mock calendar service to avoid spinning up the real Google API client
jest.mock("../services/calendar/appointments.service", () => {
  const dayjs = require("dayjs");
  const utc = require("dayjs/plugin/utc");
  const timezone = require("dayjs/plugin/timezone");
  dayjs.extend(utc);
  dayjs.extend(timezone);
  return {
    getBusyTimesUntil: jest.fn(async (calendarIds, endTime) => ({
      now:       dayjs().tz("America/Denver"),
      busyArray: []
    })),
    listAppointments: jest.fn(async () => [])
  };
});

// Mock phone alarm so it never actually fires
jest.mock("../services/phoneAlarm.service", () => ({
  setPhoneAlarm: jest.fn(async () => {})
}));

// ─────────────── Dependencies ───────────────

const request  = require("supertest");
const mongoose = require("mongoose");
const dayjs    = require("dayjs");
const tz       = require("dayjs/plugin/timezone");
dayjs.extend(tz);

const app               = require("../app");
const FreedomTimeBlock  = require("../models/freedomTimeBlocks");
const User              = require("../models/user");
const UserEmail         = require("../models/userEmail");

// ─────────────── Test Fixtures ───────────────

/** Credentials for registering and logging in the test user. */
const testUser = {
  username: "rigorous@example.com",
  password: "TestPassword123"
};

let token; // Bearer token for authenticated requests

// ─────────────── Setup & Teardown ───────────────

beforeAll(async () => {
  // Clear relevant collections to start from a blank state.
  await Promise.all([
    User.deleteMany({}),
    UserEmail.deleteMany({}),
    FreedomTimeBlock.deleteMany({})
  ]);

  // Register & login, extract the new userId straight from the response
  const regRes   = await request(app).post("/api/users/register").send(testUser);
  expect(regRes.status).toBe(200);
  const loginRes = await request(app).post("/api/users/login").send(testUser);
  expect(loginRes.status).toBe(200);
  token = loginRes.body.token;
  const userId = loginRes.body.user._id;

  // Mark that email as onboarded so freedom‑blocks endpoints will run
  const emailDoc = await UserEmail.findOneAndUpdate(
    { email: testUser.username },
    { isCalendarOnboarded: true, userId },
    { new: true }
  );
  expect(emailDoc).toBeTruthy();
});

afterAll(async () => {
  await mongoose.connection.close();
});

// ─────────────── Editing Scenario Tests ───────────────

describe("Editing Scenario", () => {
  test("Shortening a manual block creates a leftover excluded block", async () => {
    const originalStart = dayjs().add(1, "hour").startOf("hour").toDate();
    const originalEnd   = dayjs(originalStart).add(55, "minute").toDate();

    const block = await FreedomTimeBlock.create({
      startTime:  originalStart,
      endTime:    originalEnd,
      approved:   false,
      sourceType: "manual"
    });

    const newEndISO = dayjs(originalStart).add(15, "minute").toISOString();
    const updateRes = await request(app)
      .put(`/api/freedom-blocks/${block._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ startTime: originalStart.toISOString(), endTime: newEndISO });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);

    const updatedBlock = await FreedomTimeBlock.findById(block._id);
    expect(dayjs(updatedBlock.endTime).isSame(dayjs(newEndISO))).toBe(true);

    const leftover = await FreedomTimeBlock.findOne({
      sourceType: "excluded",
      startTime:  dayjs(newEndISO).toDate(),
      endTime:    originalEnd
    });
    expect(leftover).not.toBeNull();
  });
});

// ─────────────── Regeneration Scenario Tests ───────────────

describe("Regeneration Scenario", () => {
  test("Regeneration respects manual and approved blocks", async () => {
    const tz = "America/Denver";
    const manualStart = dayjs().tz(tz).add(1, "hour").startOf("minute").toDate();
    const manualEnd   = dayjs(manualStart).add(30, "minute").toDate();
    await FreedomTimeBlock.create({
      startTime:  manualStart,
      endTime:    manualEnd,
      approved:   false,
      sourceType: "manual"
    });

    const approvedStart = dayjs().tz(tz).add(2, "hour").startOf("minute").toDate();
    const approvedEnd   = dayjs(approvedStart).add(45, "minute").toDate();
    await FreedomTimeBlock.create({
      startTime:  approvedStart,
      endTime:    approvedEnd,
      approved:   true,
      sourceType: "approved"
    });

    const resSchedule = await request(app)
      .get("/api/freedom-blocks/today")
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(resSchedule.status).toBe(200);
    expect(resSchedule.body.success).toBe(true);

    resSchedule.body.timeBlocks
      .filter(tb => tb.sourceType === "auto")
      .forEach(tb => {
        const start = dayjs(tb.startTime);
        const end   = dayjs(tb.endTime);

        // must sit entirely outside the manual block
        expect(
          end.isSameOrBefore(manualStart) ||
          start.isSameOrAfter(manualEnd)
        ).toBe(true);

        // must sit entirely outside the approved block
        expect(
          end.isSameOrBefore(approvedStart) ||
          start.isSameOrAfter(approvedEnd)
        ).toBe(true);
      });
  });
});

// ─────────────── Deletion Scenario Tests ───────────────

describe("Deletion Scenario", () => {
  test("Deleted (excluded) blocks are not displayed nor regenerated", async () => {
    const tz        = "America/Denver";
    const dateToday = dayjs().tz(tz).format("YYYY-MM-DD");
    const autoStart = dayjs.tz(`${dateToday} 15:00`, "YYYY-MM-DD HH:mm", tz).toDate();
    const autoEnd   = dayjs(autoStart).add(50, "minute").toDate();

    const autoBlock = await FreedomTimeBlock.create({
      startTime:  autoStart,
      endTime:    autoEnd,
      approved:   false,
      sourceType: "auto"
    });

    const resDelete = await request(app)
      .delete(`/api/freedom-blocks/${autoBlock._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(resDelete.status).toBe(200);
    expect(resDelete.body.success).toBe(true);

    const resSchedule = await request(app)
      .get("/api/freedom-blocks/today")
      .set("Authorization", `Bearer ${token}`)
      .send();
    expect(resSchedule.status).toBe(200);

    resSchedule.body.timeBlocks.forEach(block => {
      expect(block.sourceType).not.toBe("excluded");
    });
  });
});
