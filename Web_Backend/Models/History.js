const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    file_name: {
      type: String,
      required: true,
      trim: true,
    },
    prediction: {
      type: String,
      required: true,
      enum: ["REAL", "DEEPFAKE", "N/A"],
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    real_score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    fake_score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

historySchema.index({ user_id: 1, timestamp: -1 });

const History = mongoose.model("History", historySchema);

module.exports = History;

