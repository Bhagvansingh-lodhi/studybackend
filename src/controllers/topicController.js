import { TopicPack } from "../models/TopicPack.js";
import { generateStudyPack } from "../services/aiService.js";

function computeCompletion(topic) {
  const totalModules = topic.modules?.length || 0;
  const completedModules = topic.progress?.completedModules?.length || 0;
  if (!totalModules) return 0;
  return Math.round((completedModules / totalModules) * 100);
}

// GET /api/topics
export const getTopics = async (req, res, next) => {
  try {
    const topics = await TopicPack.find({ userId: req.user._id }).sort({
      createdAt: -1
    });

    const mapped = topics.map((t) => ({
      id: t._id,
      title: t.title,
      difficulty: t.difficulty,
      createdAt: t.createdAt,
      completion: computeCompletion(t),
      stats: {
        modules: t.modules.length,
        flashcards: t.flashcards.length,
        mcqs: t.mcqs.length,
        lastQuizScore:
          t.progress?.quizzes?.[t.progress.quizzes.length - 1]?.score || null
      }
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
};

// POST /api/topics/generate
export const generateTopic = async (req, res, next) => {
  try {
    const { topicName, difficulty = "Medium" } = req.body;
    if (!topicName)
      return res.status(400).json({ message: "topicName is required" });

    const aiResult = await generateStudyPack(topicName, difficulty);

    // basic validation
    if (!aiResult.title || !Array.isArray(aiResult.modules)) {
      return res.status(500).json({ message: "AI response malformed" });
    }

    const topic = await TopicPack.create({
      userId: req.user._id,
      title: aiResult.title || topicName,
      difficulty,
      overview: aiResult.overview || "",
      modules: aiResult.modules || [],
      flashcards:
        (aiResult.flashcards || []).map((f) => ({
          question: f.question,
          answer: f.answer,
          level: f.level || "medium"
        })) || [],
      mcqs: aiResult.mcqs || [],
      subjectiveQuestions: aiResult.subjectiveQuestions || [],
      revisionPlan:
        (aiResult.revisionPlan || []).map((d) => ({
          dayIndex: d.dayIndex,
          tasks: d.tasks || [],
          completed: d.completed || false
        })) || []
    });

    res.status(201).json(topic);
  } catch (err) {
    next(err);
  }
};

// GET /api/topics/:id
export const getTopicById = async (req, res, next) => {
  try {
    const topic = await TopicPack.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!topic) return res.status(404).json({ message: "Topic not found" });

    res.json(topic);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/topics/:id/progress
export const updateProgress = async (req, res, next) => {
  try {
    const { completedModules, flashcardsStats, revisionPlan } = req.body;

    const topic = await TopicPack.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!topic) return res.status(404).json({ message: "Topic not found" });

    // merge completedModules (indices)
    if (Array.isArray(completedModules)) {
      const set = new Set([
        ...(topic.progress?.completedModules || []),
        ...completedModules
      ]);
      topic.progress.completedModules = Array.from(set).sort((a, b) => a - b);
    }

    // append flashcardsStats
    if (Array.isArray(flashcardsStats)) {
      topic.progress.flashcardsStats = [
        ...(topic.progress.flashcardsStats || []),
        ...flashcardsStats
      ];
    }

    // update revisionPlan completion (by dayIndex)
    if (Array.isArray(revisionPlan)) {
      revisionPlan.forEach((updateDay) => {
        const idx = topic.revisionPlan.findIndex(
          (d) => d.dayIndex === updateDay.dayIndex
        );
        if (idx !== -1 && typeof updateDay.completed === "boolean") {
          topic.revisionPlan[idx].completed = updateDay.completed;
        }
      });
    }

    await topic.save();
    res.json(topic.progress);
  } catch (err) {
    next(err);
  }
};

// POST /api/topics/:id/quiz
export const takeQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body; // array of selected indices
    const topic = await TopicPack.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!topic) return res.status(404).json({ message: "Topic not found" });

    if (!Array.isArray(answers) || answers.length !== topic.mcqs.length) {
      return res
        .status(400)
        .json({ message: "answers must match mcqs length" });
    }

    let correct = 0;
    const details = topic.mcqs.map((q, i) => {
      const userAnswer = answers[i];
      const isCorrect = userAnswer === q.correctIndex;
      if (isCorrect) correct++;
      return {
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        userAnswer,
        isCorrect,
        explanation: q.explanation
      };
    });

    const score = Math.round((correct / topic.mcqs.length) * 100);

    topic.progress.quizzes.push({ score });
    await topic.save();

    res.json({ score, total: topic.mcqs.length, correct, details });
  } catch (err) {
    next(err);
  }
};
