require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const path = require("path");
const isProduction = process.env.NODE_ENV === 'production';

// Routers
const freedomRouter = require("./routes/freedom.routes");
const userRouter = require("./routes/user.routes");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://springboardcapstone-bzjm.onrender.com"
];

const corsOptions = {
  origin: function (origin, callback) {
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

// API routes
app.use("/api/freedom-blocks", freedomRouter);
app.use("/api/users", userRouter);

// Default root route.
app.get("/", (req, res) => {
  res.send("Hello from AI Agents Backend!");
});

// If in production, serve static assets from the 'build' directory.
// This will allow direct access to any URL (e.g., /schedule) to load the React app.
if (isProduction) {
  app.use(express.static(path.join(__dirname, "build")));
  
  // The catch-all handler: for any request that doesn't match an API route,
  // send back React's index.html file.
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

module.exports = app;
