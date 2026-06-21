const mongoose = require("mongoose");

const History = require("../models/History");
const User = require("../models/User");

const serializeHistory = (historyDoc) => ({
  id: historyDoc._id.toString(),
  user_id: historyDoc.user_id.toString(),
  file_name: historyDoc.file_name,
  prediction: historyDoc.prediction,
  confidence: Number(historyDoc.confidence),
  real_score: Number(historyDoc.real_score),
  fake_score: Number(historyDoc.fake_score),
  timestamp: historyDoc.timestamp.toISOString(),
});

const isValidScore = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

const createHistoryEntry = async (req, res) => {
  try {
    const {
      user_id,
      file_name,
      prediction,
      confidence,
      real_score,
      fake_score,
      timestamp,
    } = req.body;

    if (!user_id || !file_name || !prediction) {
      return res.status(400).json({ detail: "user_id, file_name and prediction are required." });
    }

    if (
      !isValidScore(Number(confidence)) ||
      !isValidScore(Number(real_score)) ||
      !isValidScore(Number(fake_score))
    ) {
      return res.status(400).json({ detail: "Score values must be between 0 and 1." });
    }

    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ detail: "User not found for history entry." });
    }

    const entry = await History.create({
      user_id: user._id,
      file_name: String(file_name).trim(),
      prediction: String(prediction),
      confidence: Number(confidence),
      real_score: Number(real_score),
      fake_score: Number(fake_score),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    return res.status(201).json(serializeHistory(entry));
  } catch (error) {
    return res.status(400).json({ detail: "Failed to create history entry." });
  }
};

const getHistoryByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ detail: "Invalid user id." });
    }

    const entries = await History.find({ user_id: userId }).sort({ timestamp: -1 });
    return res.status(200).json(entries.map(serializeHistory));
  } catch (error) {
    return res.status(500).json({ detail: "Failed to fetch history." });
  }
};

const deleteHistoryEntry = async (req, res) => {
  try {
    const { entryId } = req.params;

    if (!mongoose.isValidObjectId(entryId)) {
      return res.status(400).json({ detail: "Invalid history id." });
    }

    const deleted = await History.findByIdAndDelete(entryId);
    if (!deleted) {
      return res.status(404).json({ detail: "History entry not found." });
    }

    return res.status(200).json({ deleted: true, entry_id: entryId });
  } catch (error) {
    return res.status(500).json({ detail: "Failed to delete history entry." });
  }
};

const clearHistoryByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ detail: "Invalid user id." });
    }

    const result = await History.deleteMany({ user_id: userId });
    return res.status(200).json({ deleted: result.deletedCount, user_id: userId });
  } catch (error) {
    return res.status(500).json({ detail: "Failed to clear history." });
  }
};

module.exports = {
  createHistoryEntry,
  getHistoryByUser,
  deleteHistoryEntry,
  clearHistoryByUser,
};

