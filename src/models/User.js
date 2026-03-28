import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true
    },

    email: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true,
      lowercase: true, // 🔥 fixes duplicate issue
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email"]
    },

    passwordHash: { 
      type: String, 
      required: true,
      select: false // 🔥 VERY IMPORTANT (security + performance)
    }
  },
  { 
    timestamps: true // cleaner
  }
);

// 🚀 Faster JSON response (removes unnecessary fields)
userSchema.set("toJSON", {
  transform: (_, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.model("User", userSchema);