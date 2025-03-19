// app.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const session = require("express-session"); // Import express-session


// Routers
const freedomRouter = require("./routes/freedom.routes");
const userRouter = require("./routes/user.routes");

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",  // or the exact origin of your Vite dev server
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(fileUpload());

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET, // secure secret value
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if you use HTTPS in production
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  }
}));

// Our route handlers
app.use("/api/freedom-blocks", freedomRouter);
app.use("/api/users", userRouter);

// Optionally, a simple test route
app.get("/", (req, res) => {
  res.send("Hello from AI Agents Backend!");
});

module.exports = app;
