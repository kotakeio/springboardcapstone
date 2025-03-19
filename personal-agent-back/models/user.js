// models/User.js

// 1. Import Mongoose to create a schema and model
const mongoose = require('mongoose');

// 2. Define the schema for a User
const userSchema = new mongoose.Schema(
  {
    // Username: must be unique and required
    username: {
      type: String,
      required: true,
      unique: true,
    },
    // Password hash: store the hashed password (required)
    passwordHash: {
      type: String,
      required: true,
    },
    // User's timezone (e.g., "America/Denver")
    timezone: {
      type: String,
      required: true,
    },
    // Flag to track if onboarding is completed; defaults to false
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    // Soft-delete field: if set, indicates the deletion time (optional)
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// 3. Export the model so it can be used elsewhere in your app
module.exports = mongoose.model('User', userSchema);
