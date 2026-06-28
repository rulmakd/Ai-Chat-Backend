import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import errorHandler from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

// Initialize express app
const app = express();

// Connect to mongoDB
connectDB();

//Middleware to handle cors
// Note: credentials:true cannot be combined with origin:"*" per the CORS spec
// (browsers reject it). Since this API authenticates via a Bearer token in the
// Authorization header rather than cookies, credentials aren't needed at all.
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple health check — handy for deployment platforms (Render/Vercel) to verify the app is up
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "OK" });
});

//Routes
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/ai", aiRoutes);

// 404 handler — must come after all real routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    statusCode: 404,
  });
});

// Error handler — must be last
app.use(errorHandler);

//Start Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.error(`Error:${err.message}`);
  process.exit(1);
});
