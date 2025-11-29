import express from "express";
import {
  getTopics,
  generateTopic,
  getTopicById,
  updateProgress,
  takeQuiz
} from "../controllers/topicController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getTopics);
router.post("/generate", generateTopic);
router.get("/:id", getTopicById);
router.patch("/:id/progress", updateProgress);
router.post("/:id/quiz", takeQuiz);

export default router;
