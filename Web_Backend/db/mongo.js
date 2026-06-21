const mongoose = require("mongoose");

const connectMongo = async () => {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/audio_spoof_detection";

  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB_NAME || "audio_spoof_detection",
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = {
  connectMongo,
};

