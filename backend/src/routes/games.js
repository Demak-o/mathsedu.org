import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/scores", requireAuth, (req, res) => {
  const { gameId, points } = req.body;
  if (!gameId || Number.isNaN(Number(points))) {
    return res.status(400).json({ error: "gameId and numeric points are required" });
  }

  const score = {
    id: uuidv4(),
    gameId,
    userId: req.auth.sub,
    points: Number(points),
    createdAt: new Date().toISOString(),
  };
  db.gameScores.push(score);
  return res.status(201).json(score);
});

router.get("/leaderboard/:gameId", (req, res) => {
  const { gameId } = req.params;
  const scores = db.gameScores
    .filter((s) => s.gameId === gameId)
    .sort((a, b) => b.points - a.points)
    .slice(0, 20)
    .map((s) => {
      const user = db.users.find((u) => u.id === s.userId);
      return {
        userId: s.userId,
        displayName: user?.displayName || "Unknown",
        points: s.points,
        createdAt: s.createdAt,
      };
    });

  return res.json({ gameId, top: scores });
});

router.get("/leaderboard-total", (_req, res) => {
  const bestByUserGame = new Map();

  db.gameScores.forEach((score) => {
    const key = `${score.userId}:${score.gameId}`;
    const existing = bestByUserGame.get(key);
    if (!existing || score.points > existing.points) {
      bestByUserGame.set(key, score);
    }
  });

  const totalsByUser = new Map();
  bestByUserGame.forEach((score) => {
    const total = totalsByUser.get(score.userId) || 0;
    totalsByUser.set(score.userId, total + score.points);
  });

  const top = Array.from(totalsByUser.entries())
    .map(([userId, totalPoints]) => {
      const user = db.users.find((u) => u.id === userId);
      return {
        userId,
        displayName: user?.displayName || "Unknown",
        totalPoints,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 20);

  return res.json({ top });
});

export default router;
