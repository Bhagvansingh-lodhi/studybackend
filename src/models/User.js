import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

export const User = mongoose.model("User", userSchema);
