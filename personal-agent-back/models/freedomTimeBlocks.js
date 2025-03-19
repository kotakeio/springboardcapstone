// models/FreedomTimeBlock.js

// 1. Import Mongoose
const mongoose = require('mongoose');

// 2. Define the schema for a Freedom Time Block
const FreedomTimeBlockSchema = new mongoose.Schema(
  {
    // The starting time for the block (required Date)
    startTime: {
      type: Date,
      required: true,
    },
    // The ending time for the block (required Date)
    endTime: {
      type: Date,
      required: true,
    },
    // Whether the block has been approved (defaults to false)
    approved: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically add 'createdAt' and 'updatedAt' fields
    timestamps: true,
    // Disable the __v version key
    versionKey: false,
  }
);

// 3. Export the Mongoose model for use in your app
module.exports = mongoose.model('FreedomTimeBlock', FreedomTimeBlockSchema);
