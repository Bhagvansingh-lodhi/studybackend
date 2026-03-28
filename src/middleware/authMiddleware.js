import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    // 🚀 No DB call (FAST)
    req.user = decoded; // { userId, email, name }

    return next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};