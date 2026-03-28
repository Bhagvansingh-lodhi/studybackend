import { TopicPack } from "../models/TopicPack.js";
import { generateStudyPack } from "../services/aiService.js";

/* ---------- Utils ---------- */
function computeCompletion(topic) {
  const totalModules = topic.modules?.length || 0;
  const completedModules = topic.progress?.completedModules?.length || 0;
  if (!totalModules) return 0;
  return Math.round((completedModules / totalModules) * 100);
}

/* ---------- GET ALL TOPICS ---------- */
export const getTopics = async (req, res, next) => {
  try {
    const topics = await TopicPack.find({ userId: req.user.userId })
      .select("title difficulty createdAt modules flashcards mcqs progress")
      .sort({ createdAt: -1 })
      .lean();

    const mapped = topics.map((t) => ({
      id: t._id,
      title: t.title,
      difficulty: t.difficulty,
      createdAt: t.createdAt,
      completion: computeCompletion(t),
      stats: {
        modules: t.modules?.length || 0,
        flashcards: t.flashcards?.length || 0,
        mcqs: t.mcqs?.length || 0,
        lastQuizScore:
          t.progress?.quizzes?.[t.progress.quizzes.length - 1]?.score || null
      }
    }));

    return res.json(mapped);
  } catch (err) {
    next(err);
  }
};

/* ---------- GENERATE TOPIC (NON-BLOCKING AI) ---------- */
export const generateTopic = async (req, res, next) => {
  try {
    const { topicName, difficulty = "Medium" } = req.body;

    if (!topicName)
      return res.status(400).json({ message: "topicName is required" });

    // ✅ Check cache (avoid AI call if already exists)
    const existing = await TopicPack.findOne({
      userId: req.user.userId,
      title: topicName,
      difficulty
    }).lean();

    if (existing) {
      return res.json(existing);
    }

    // 🚀 Step 1: Create placeholder topic instantly
    const topic = await TopicPack.create({
      userId: req.user.userId,
      title: topicName,
      difficulty,
      status: "processing",
      modules: [],
      flashcards: [],
      mcqs: [],
      subjectiveQuestions: [],
      revisionPlan: [],
      progress: {
        completedModules: [],
        flashcardsStats: [],
        quizzes: [],
        revisionPlan: []
      }
    });

    // ⚡ Step 2: Respond immediately
    res.status(202).json({
      message: "Topic generation started",
      topicId: topic._id
    });

    // 🔥 Step 3: Background AI processing
    (async () => {
      try {
        const aiResult = await generateStudyPack(topicName, difficulty);

        await TopicPack.findByIdAndUpdate(topic._id, {
          title: aiResult.title || topicName,
          overview: aiResult.overview || "",
          modules: aiResult.modules || [],
          flashcards: (aiResult.flashcards || []).map((f) => ({
            question: f.question,
            answer: f.answer,
            level: f.level || "medium"
          })),
          mcqs: aiResult.mcqs || [],
          subjectiveQuestions: aiResult.subjectiveQuestions || [],
          revisionPlan: aiResult.revisionPlan || [],
          status: "ready",
          progress: {
            completedModules: [],
            flashcardsStats: [],
            quizzes: [],
            revisionPlan: (aiResult.revisionPlan || []).map((d) => ({
              dayIndex: d.dayIndex,
              completed: false
            }))
          }
        });
      } catch (err) {
        await TopicPack.findByIdAndUpdate(topic._id, {
          status: "failed"
        });
      }
    })();

  } catch (err) {
    next(err);
  }
};

/* ---------- GET SINGLE TOPIC ---------- */
export const getTopicById = async (req, res, next) => {
  try {
    const topic = await TopicPack.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).lean();

    if (!topic)
      return res.status(404).json({ message: "Topic not found" });

    return res.json(topic);
  } catch (err) {
    next(err);
  }
};

/* ---------- UPDATE PROGRESS ---------- */
export const updateProgress = async (req, res, next) => {
  try {
    const updates = req.body;

    const topic = await TopicPack.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!topic)
      return res.status(404).json({ message: "Topic not found" });

    const updatedProgress = {
      completedModules:
        updates.completedModules ?? topic.progress.completedModules,
      flashcardsStats:
        updates.flashcardsStats ?? topic.progress.flashcardsStats,
      revisionPlan:
        updates.revisionPlan ?? topic.progress.revisionPlan,
      quizzes: topic.progress.quizzes
    };

    await TopicPack.findByIdAndUpdate(req.params.id, {
      $set: { progress: updatedProgress }
    });

    return res.json(updatedProgress);
  } catch (err) {
    next(err);
  }
};

/* ---------- QUIZ ---------- */
export const takeQuiz = async (req, res, next) => {
  try {
    const { answers } = req.body;

    const topic = await TopicPack.findOne({
      _id: req.params.id,
      userId: req.user.userId
    })
      .select("mcqs progress")
      .lean();

    if (!topic)
      return res.status(404).json({ message: "Topic not found" });

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

    // ⚡ push quiz without loading full doc
    await TopicPack.findByIdAndUpdate(req.params.id, {
      $push: { "progress.quizzes": { score } }
    });

    return res.json({
      score,
      total: topic.mcqs.length,
      correct,
      details
    });

  } catch (err) {
    next(err);
  }
};