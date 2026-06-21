const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const historyRoutes = require("./routes/historyRoutes");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.status(200).json({ message: "Web backend API is running" });
});

app.use("/api/users", userRoutes);
app.use("/api/history", historyRoutes);

app.use((req, res) => {
  res.status(404).json({ detail: "Route not found." });
});

module.exports = app;

