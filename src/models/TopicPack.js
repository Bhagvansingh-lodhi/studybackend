import mongoose from "mongoose";

/* ---------- SUB SCHEMAS ---------- */
const moduleSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
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
      validate: [(arr) => arr.length === 4, "Exactly 4 options required"]
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
    completed: { type: Boolean, default: false } // 🔥 added
  },
  { _id: false }
);

const flashcardStatSchema = new mongoose.Schema(
  {
    cardIndex: Number,
    level: { type: String, enum: ["easy", "medium", "hard"] }
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

/* ---------- PROGRESS ---------- */
const progressSchema = new mongoose.Schema(
  {
    completedModules: { type: [Number], default: [] },
    flashcardsStats: { type: [flashcardStatSchema], default: [] },
    revisionPlan: {
      type: [{ dayIndex: Number, completed: Boolean }],
      default: []
    },
    quizzes: { type: [quizAttemptSchema], default: [] }
  },
  { _id: false }
);

/* ---------- MAIN SCHEMA ---------- */
const topicPackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true // 🔥 IMPORTANT
    },

    title: {
      type: String,
      required: true,
      trim: true,
      index: true // 🔥 for search
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Medium",
      index: true
    },

    // 🔥 NEW (VERY IMPORTANT)
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "ready",
      index: true
    },

    overview: String,

    modules: {
      type: [moduleSchema],
      default: []
    },

    flashcards: {
      type: [flashcardSchema],
      default: []
    },

    mcqs: {
      type: [mcqSchema],
      default: []
    },

    subjectiveQuestions: {
      type: [subjectiveSchema],
      default: []
    },

    revisionPlan: {
      type: [revisionDaySchema],
      default: []
    },

    progress: {
      type: progressSchema,
      default: () => ({
        completedModules: [],
        flashcardsStats: [],
        revisionPlan: [],
        quizzes: []
      })
    }
  },
  { timestamps: true }
);

/* ---------- INDEXES (BIG PERFORMANCE BOOST) ---------- */

// 🔥 Most important query optimization
topicPackSchema.index({ userId: 1, createdAt: -1 });

// 🔥 Cache/search optimization
topicPackSchema.index({ userId: 1, title: 1, difficulty: 1 });

/* ---------- CLEAN RESPONSE ---------- */
topicPackSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const TopicPack = mongoose.model("TopicPack", topicPackSchema);