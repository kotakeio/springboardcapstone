// ------------------------------------------------------------------
// Module:    tests/freedomBlocks.test.js
// Author:    John Gibson
// Created:   2025‑04‑21
// Purpose:   Integration tests for Freedom Blocks endpoints, covering
//            manual edits, block regeneration, deletions, and scheduling.
// ------------------------------------------------------------------

/**
 * @module tests/freedomBlocks.test
 * @description
 *   - Sets up a dummy environment and mocks external services.
 *   - Verifies behavior of shortening manual blocks, regenerating free blocks,
 *     and excluding deleted blocks.
 *   - Uses Supertest against the Express app with JWT auth.
 */

// ─────────────── Test Framework Configuration ───────────────

jest.setTimeout(70000); // for slow operations

// ─────────────── Environment & Mocks ───────────────

process.env.SESSION_SECRET         = "dummySecret";
process.env.JWT_SECRET             = "dummyJwtSecret";
process.env.PHONE_ALARM_ENDPOINTS  = "http://dummy.com";

jest.mock("../services/calendar/appointments.service", () => {
  const dayjs = require("dayjs");
  const utc = require("dayjs/plugin/utc");
  const timezone = require("dayjs/plugin/timezone");
  dayjs.extend(utc);
  dayjs.extend(timezone);
  return {
    getBusyTimesUntil: jest.fn(async () => ({
      now:       dayjs().tz("America/Denver"),
      busyArray: []
    })),
    listAppointments: jest.fn(async () => [])
  };
});

jest.mock("../services/phoneAlarm.service", () => ({
  setPhoneAlarm: jest.fn(async () => {})
}));

// ─────────────── Dependencies ───────────────

const request            = require("supertest");
const dayjs              = require("dayjs");
const tzPlugin           = require("dayjs/plugin/timezone");
dayjs.extend(tzPlugin);

const app                = require("../app");
const User               = require("../models/user");
const UserEmail          = require("../models/userEmail");
const FreedomTimeBlock   = require("../models/freedomTimeBlocks");

// ─────────────── Test Data & Globals ───────────────

const testUser = {
  username: "testfreedom@example.com",
  password: "TestPassword123"
};

let token;

// ─────────────── Lifecycle Hooks ───────────────

beforeEach(async () => {
  // Clean slate
  await Promise.all([
    User.deleteMany({}),
    UserEmail.deleteMany({}),
    FreedomTimeBlock.deleteMany({})
  ]);

  // Register & login
  const regRes   = await request(app).post("/api/users/register").send(testUser);
  expect(regRes.status).toBe(200);
  const loginRes = await request(app).post("/api/users/login").send(testUser);
  expect(loginRes.status).toBe(200);
  token = loginRes.body.token;
  const userId = loginRes.body.user._id;

  // Mark calendar email onboarded
  const emailDoc = await UserEmail.findOneAndUpdate(
    { email: testUser.username },
    { isCalendarOnboarded: true, userId },
    { new: true }
  );
  expect(emailDoc).toBeTruthy();
});

afterEach(async () => {
  await FreedomTimeBlock.deleteMany({});
});

// ─────────────── Test Suites ───────────────

describe("Freedom Blocks Endpoints", () => {
  describe("Editing and Regeneration with manual & approved blocks", () => {

    test("Shortening a manual block creates a leftover excluded block", async () => {
      const dateToday    = dayjs().tz("America/Denver").format("YYYY-MM-DD");
      const originalStart = dayjs.tz(`${dateToday} 12:00`, "YYYY-MM-DD HH:mm", "America/Denver").toDate();
      const originalEnd   = dayjs.tz(`${dateToday} 12:55`, "YYYY-MM-DD HH:mm", "America/Denver").toDate();

      const block = await FreedomTimeBlock.create({
        startTime:  originalStart,
        endTime:    originalEnd,
        approved:   false,
        sourceType: "manual"
      });

      const newEndISO = dayjs(originalStart).add(15, "minute").toISOString();
      const resUpdate = await request(app)
        .put(`/api/freedom-blocks/${block._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ startTime: originalStart.toISOString(), endTime: newEndISO });

      expect(resUpdate.status).toBe(200);
      expect(resUpdate.body.success).toBe(true);

      const updated = resUpdate.body.block;
      expect(new Date(updated.endTime).getTime()).toEqual(new Date(newEndISO).getTime());

      const leftovers = await FreedomTimeBlock.find({ sourceType: "excluded" });
      expect(leftovers).toHaveLength(1);
      expect(new Date(leftovers[0].startTime).getTime()).toEqual(new Date(newEndISO).getTime());
      expect(new Date(leftovers[0].endTime).getTime()).toEqual(originalEnd.getTime());
    });

    test("Regeneration respects manual and approved blocks", async () => {
      const dateToday    = dayjs().tz("America/Denver").format("YYYY-MM-DD");
      const manualStart  = dayjs.tz(`${dateToday} 13:00`, "YYYY-MM-DD HH:mm", "America/Denver").toDate();
      const manualEnd    = dayjs(manualStart).add(30, "minute").toDate();
      await FreedomTimeBlock.create({ startTime: manualStart, endTime: manualEnd, approved: false, sourceType: "manual" });

      const approvedStart = dayjs.tz(`${dateToday} 14:00`, "YYYY-MM-DD HH:mm", "America/Denver").toDate();
      const approvedEnd   = dayjs(approvedStart).add(50, "minute").toDate();
      await FreedomTimeBlock.create({ startTime: approvedStart, endTime: approvedEnd, approved: true, sourceType: "approved" });

      const resSchedule = await request(app)
        .get("/api/freedom-blocks/today")
        .set("Authorization", `Bearer ${token}`)
        .send();

      expect(resSchedule.status).toBe(200);
      expect(resSchedule.body.success).toBe(true);

      resSchedule.body.timeBlocks
        .filter(b => b.sourceType === "auto")
        .forEach(b => {
          const start = new Date(b.startTime);
          const end   = new Date(b.endTime);

          // must lie entirely outside manual block
          expect(
            end <= manualStart ||
            start >= manualEnd
          ).toBe(true);

          // must lie entirely outside approved block
          expect(
            end <= approvedStart ||
            start >= approvedEnd
          ).toBe(true);
        });
    });

    test("Deleted (excluded) blocks are not displayed nor regenerated", async () => {
      const dateToday = dayjs().tz("America/Denver").format("YYYY-MM-DD");
      const autoStart = dayjs.tz(`${dateToday} 15:00`, "YYYY-MM-DD HH:mm", "America/Denver").toDate();
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
      resSchedule.body.timeBlocks.forEach(b => {
        expect(b.sourceType).not.toBe("excluded");
      });
    });

  });
});
