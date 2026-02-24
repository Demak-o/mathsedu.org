import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { db } from "../lib/store.js";

const router = Router();

function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, displayName: user.displayName },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );
}

router.post("/signup", async (req, res) => {
  const { displayName, realName, email, phone, password } = req.body;
  if (!displayName || !realName || !email || !phone || !password) {
    return res.status(400).json({ error: "displayName, realName, email, phone and password are required" });
  }

  const exists = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    displayName,
    realName,
    email,
    phone,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);

  return res.status(201).json({
    user: {
      id: user.id,
      displayName: user.displayName,
      realName: user.realName,
      email: user.email,
      phone: user.phone,
    },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = createToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      displayName: user.displayName,
      realName: user.realName,
      email: user.email,
      phone: user.phone,
    },
  });
});

export default router;
