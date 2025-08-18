import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

dotenv.config();

import authRoutes from "./routes/auth.js";
import communityRoutes from "./routes/community.js";
import journalRoutes from "./routes/journal.js";
import statsRoutes from "./routes/stats.js";
import aiRoutes from "./routes/ai.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/journals/stats", statsRoutes);
app.use("/api/ai", aiRoutes);

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Willora backend is running" });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI) // remove deprecated options
  .then(() => {
    console.log("✅ MongoDB connected");

    // Start server only after DB is connected
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
  });
