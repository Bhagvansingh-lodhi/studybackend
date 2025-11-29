import express from "express";
import cors from "cors";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import topicRoutes from "./routes/topicRoutes.js";

const app = express();

// CORS: allowing local frontend only (production mai change kar dena)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ],
    credentials: true,
  })
);

app.use(express.json());

// health check route
app.get("/", (req, res) => {
  res.json({ message: "StudyArchitect API running" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/topics", topicRoutes);

// error handlers
app.use(notFound);
app.use(errorHandler);

export default app;
