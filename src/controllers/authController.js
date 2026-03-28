import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { config } from "../config/env.js";

const generateToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      email: user.email,
      name: user.name
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

// ================= REGISTER =================
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const existing = await User.findOne({ email }).lean();
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, passwordHash });

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (err) {
    next(err);
  }
};

// ================= LOGIN =================
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ email })
      .select("+passwordHash name email")
      .lean();

    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (err) {
    next(err);
  }
};