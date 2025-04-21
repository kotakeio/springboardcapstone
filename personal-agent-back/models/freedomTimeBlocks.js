const mongoose = require('mongoose');

const FreedomTimeBlockSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    sourceType: {
      type: String,
      enum: ['auto', 'manual', 'approved', 'excluded'],
      default: function () {
        return this.approved ? 'approved' : 'auto';
      },
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('FreedomTimeBlock', FreedomTimeBlockSchema);
