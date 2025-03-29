// app.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const { isAuthenticated } = require('./middleware/auth');
const isProduction = process.env.NODE_ENV === 'production';

// Routers
const freedomRouter = require("./routes/freedom.routes");
const userRouter = require("./routes/user.routes");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",      // local Vite dev server
  "https://springboardcapstone-bzjm.onrender.com" 
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(fileUpload());
app.use(isAuthenticated);

// Set up session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction, 
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
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
