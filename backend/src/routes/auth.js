import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { db } from "../lib/store.js";
import { sendVerificationCode } from "../services/smsProvider.js";

const router = Router();

function createToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, displayName: user.displayName },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: "7d" }
  );
}

router.post("/signup", async (req, res) => {
  const { displayName, email, phone, password } = req.body;
  if (!displayName || !email || !phone || !password) {
    return res.status(400).json({ error: "displayName, email, phone and password are required" });
  }

  const exists = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    displayName,
    email,
    phone,
    passwordHash,
    phoneVerified: false,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.otpCodes.push({
    id: uuidv4(),
    phone,
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
  await sendVerificationCode(phone, code);

  return res.status(201).json({
    user: { id: user.id, displayName: user.displayName, email: user.email, phone: user.phone, phoneVerified: false },
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
      email: user.email,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
    },
  });
});

router.post("/verify-phone", (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ error: "phone and code are required" });

  const recordIndex = db.otpCodes.findIndex((otp) => otp.phone === phone && otp.code === code);
  if (recordIndex === -1) return res.status(400).json({ error: "Invalid code" });

  const record = db.otpCodes[recordIndex];
  if (record.expiresAt < Date.now()) {
    db.otpCodes.splice(recordIndex, 1);
    return res.status(400).json({ error: "Code expired" });
  }

  const user = db.users.find((u) => u.phone === phone);
  if (!user) return res.status(404).json({ error: "User not found for phone" });

  user.phoneVerified = true;
  db.otpCodes.splice(recordIndex, 1);
  return res.json({ ok: true });
});

export default router;
