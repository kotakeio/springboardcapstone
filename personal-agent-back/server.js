// server.js
require("dotenv").config();
const http = require("http");
const app = require("./app"); // your Express app
const mongoose = require("./config/mongo"); // Ensure this is required so connection is initiated

const PORT = process.env.PORT || 5000;

// Create an HTTP server from our Express app
const server = http.createServer(app);

// Wait for Mongoose to establish the connection before starting the server
mongoose.connection.once("open", () => {
  console.log("Mongoose connection is open. Starting server...");
  server.listen(PORT, () => {
    console.log(`Backend is listening on port ${PORT}...`);
  });
});

// Optional: also listen for error events on the connection
mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});
