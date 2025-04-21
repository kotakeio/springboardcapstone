// models/userEmail.js

const mongoose = require('mongoose');

const userEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.'],
    },
    isCalendarOnboarded: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'userEmails',
  }
);

module.exports = mongoose.models.userEmail || mongoose.model('userEmail', userEmailSchema);
