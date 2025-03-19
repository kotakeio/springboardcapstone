// models/userEmail.js

// 1. Import Mongoose to define our schema and model
const mongoose = require('mongoose');

// 2. Define the schema for a userEmail
const userEmailSchema = new mongoose.Schema(
  {
    // The email field: required, must be unique, and validated against a basic email regex.
    email: {
      type: String,
      required: true,
      unique: true,
      // Regular expression to check for a valid email address.
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
    },
    // Flag to indicate if the calendar is onboarded; defaults to false.
    isCalendarOnboarded: {
      type: Boolean,
      default: false,
    },
    // Reference to a User document. In Mongoose, we use ObjectId and a reference ('User')
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },
    // Soft-delete field: if set, indicates when this document was "deleted."
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    // Enable automatic creation of createdAt and updatedAt fields.
    timestamps: true,
    // Optionally, specify the collection name (similar to table name in SQL)
    collection: 'userEmails',
  }
);

// 3. Export the model so it can be imported and used in your application.
module.exports = mongoose.models.userEmail || mongoose.model('userEmail', userEmailSchema);
