const express = require("express");

const {
  createHistoryEntry,
  getHistoryByUser,
  deleteHistoryEntry,
  clearHistoryByUser,
} = require("../controllers/historyController");

const router = express.Router();

router.post("/", createHistoryEntry);
router.get("/user/:userId", getHistoryByUser);
router.delete("/:entryId", deleteHistoryEntry);
router.delete("/user/:userId", clearHistoryByUser);

module.exports = router;

