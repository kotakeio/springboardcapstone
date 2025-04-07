// app.test.js

// app.test.js

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

const request = require("supertest");
const app = require("../app");

describe("App", () => {
  test("GET / should return a welcome message", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.text).toContain("Hello from AI Agents Backend!");
  });
});
