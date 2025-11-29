import mongoose from "mongoose";

const moduleSchema = new mongoose.Schema(
  {
    name: String,
    summary: String,
    keyPoints: [String],
    keyTerms: [String]
  },
  { _id: false }
);

const flashcardSchema = new mongoose.Schema(
  {
    question: String,
    answer: String,
    level: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    }
  },
  { _id: false }
);

const mcqSchema = new mongoose.Schema(
  {
    question: String,
    options: {
      type: [String],
      validate: [arr => arr.length === 4, "Exactly 4 options required"]
    },
    correctIndex: Number,
    explanation: String
  },
  { _id: false }
);

const subjectiveSchema = new mongoose.Schema(
  {
    question: String,
    hintKeywords: [String]
  },
  { _id: false }
);

const revisionDaySchema = new mongoose.Schema(
  {
    dayIndex: Number,
    tasks: [String],
    completed: { type: Boolean, default: false }
  },
  { _id: false }
);

const flashcardStatSchema = new mongoose.Schema(
  {
    cardIndex: Number,
    level: {
      type: String,
      enum: ["easy", "medium", "hard"]
    }
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    score: Number,
    date: { type: Date, default: Date.now }
  },
  { _id: false }
);

const progressSchema = new mongoose.Schema(
  {
    completedModules: [Number],
    flashcardsStats: [flashcardStatSchema],
    quizzes: [quizAttemptSchema]
  },
  { _id: false }
);

const topicPackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium"
    },
    overview: String,
    modules: [moduleSchema],
    flashcards: [flashcardSchema],
    mcqs: [mcqSchema],
    subjectiveQuestions: [subjectiveSchema],
    revisionPlan: [revisionDaySchema],
    progress: {
      type: progressSchema,
      default: () => ({
        completedModules: [],
        flashcardsStats: [],
        quizzes: []
      })
    }
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

export const TopicPack = mongoose.model("TopicPack", topicPackSchema);
