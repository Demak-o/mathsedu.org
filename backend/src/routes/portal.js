import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/groups", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const group = {
    id: uuidv4(),
    name,
    ownerId: req.auth.sub,
    createdAt: new Date().toISOString(),
  };
  db.groups.push(group);
  db.groupMembers.push({ groupId: group.id, userId: req.auth.sub, role: "owner" });
  return res.status(201).json(group);
});

router.get("/groups", (req, res) => {
  const memberships = db.groupMembers.filter((m) => m.userId === req.auth.sub).map((m) => m.groupId);
  const groups = db.groups.filter((g) => memberships.includes(g.id));
  return res.json(groups);
});

router.post("/groups/:groupId/messages", (req, res) => {
  const { groupId } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  const isMember = db.groupMembers.some((m) => m.groupId === groupId && m.userId === req.auth.sub);
  if (!isMember) return res.status(403).json({ error: "Not a group member" });

  const message = {
    id: uuidv4(),
    groupId,
    senderId: req.auth.sub,
    text,
    createdAt: new Date().toISOString(),
  };
  db.messages.push(message);
  return res.status(201).json(message);
});

router.get("/groups/:groupId/messages", (req, res) => {
  const { groupId } = req.params;
  const isMember = db.groupMembers.some((m) => m.groupId === groupId && m.userId === req.auth.sub);
  if (!isMember) return res.status(403).json({ error: "Not a group member" });

  const messages = db.messages.filter((m) => m.groupId === groupId);
  return res.json(messages);
});

export default router;
