import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../lib/store.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

function conversationTitle(group, userId) {
  if (group.type !== "direct") return group.name;

  const memberIds = db.groupMembers.filter((m) => m.groupId === group.id).map((m) => m.userId);
  const otherUserId = memberIds.find((id) => id !== userId);
  const otherUser = db.users.find((u) => u.id === otherUserId);
  return otherUser?.displayName || "Direct message";
}

function isMember(groupId, userId) {
  return db.groupMembers.some((m) => m.groupId === groupId && m.userId === userId);
}

router.get("/conversations", (req, res) => {
  const memberGroupIds = db.groupMembers.filter((m) => m.userId === req.auth.sub).map((m) => m.groupId);
  const conversations = db.groups
    .filter((g) => memberGroupIds.includes(g.id))
    .map((group) => {
      const recent = [...db.messages]
        .filter((m) => m.groupId === group.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        id: group.id,
        type: group.type || "group",
        name: conversationTitle(group, req.auth.sub),
        createdAt: group.createdAt,
        updatedAt: recent?.createdAt || group.createdAt,
        lastMessage: recent ? { text: recent.text, createdAt: recent.createdAt } : null,
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return res.json(conversations);
});

router.post("/conversations", (req, res) => {
  const { type, name, targetEmail, memberEmails = [] } = req.body;

  if (!type || !["group", "direct"].includes(type)) {
    return res.status(400).json({ error: "type must be 'group' or 'direct'" });
  }

  if (type === "direct") {
    if (!targetEmail) return res.status(400).json({ error: "targetEmail is required for direct messages" });

    const other = db.users.find((u) => u.email.toLowerCase() === String(targetEmail).toLowerCase());
    if (!other) return res.status(404).json({ error: "User not found for targetEmail" });
    if (other.id === req.auth.sub) return res.status(400).json({ error: "Cannot create direct message with yourself" });

    const myDirectGroupIds = db.groupMembers
      .filter((m) => m.userId === req.auth.sub)
      .map((m) => m.groupId)
      .filter((id) => db.groups.some((g) => g.id === id && g.type === "direct"));

    const existing = myDirectGroupIds.find((groupId) => isMember(groupId, other.id));
    if (existing) {
      const group = db.groups.find((g) => g.id === existing);
      return res.status(200).json({
        id: group.id,
        type: group.type,
        name: conversationTitle(group, req.auth.sub),
        createdAt: group.createdAt,
      });
    }

    const group = {
      id: uuidv4(),
      name: "direct",
      type: "direct",
      ownerId: req.auth.sub,
      createdAt: new Date().toISOString(),
    };
    db.groups.push(group);
    db.groupMembers.push({ groupId: group.id, userId: req.auth.sub, role: "member" });
    db.groupMembers.push({ groupId: group.id, userId: other.id, role: "member" });

    return res.status(201).json({
      id: group.id,
      type: group.type,
      name: conversationTitle(group, req.auth.sub),
      createdAt: group.createdAt,
    });
  }

  if (!name) return res.status(400).json({ error: "name is required for group chats" });

  const group = {
    id: uuidv4(),
    name,
    type: "group",
    ownerId: req.auth.sub,
    createdAt: new Date().toISOString(),
  };

  db.groups.push(group);
  db.groupMembers.push({ groupId: group.id, userId: req.auth.sub, role: "owner" });

  if (Array.isArray(memberEmails)) {
    memberEmails.forEach((email) => {
      const user = db.users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase());
      if (user && user.id !== req.auth.sub && !isMember(group.id, user.id)) {
        db.groupMembers.push({ groupId: group.id, userId: user.id, role: "member" });
      }
    });
  }

  return res.status(201).json({ id: group.id, type: group.type, name: group.name, createdAt: group.createdAt });
});

router.post("/conversations/:conversationId/messages", (req, res) => {
  const { conversationId } = req.params;
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });

  if (!isMember(conversationId, req.auth.sub)) return res.status(403).json({ error: "Not a conversation member" });

  const sender = db.users.find((u) => u.id === req.auth.sub);
  const message = {
    id: uuidv4(),
    groupId: conversationId,
    senderId: req.auth.sub,
    senderDisplayName: sender?.displayName || req.auth.displayName || "Unknown",
    text,
    createdAt: new Date().toISOString(),
  };

  db.messages.push(message);
  return res.status(201).json(message);
});

router.get("/conversations/:conversationId/messages", (req, res) => {
  const { conversationId } = req.params;
  if (!isMember(conversationId, req.auth.sub)) return res.status(403).json({ error: "Not a conversation member" });

  const messages = db.messages
    .filter((m) => m.groupId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((message) => {
      const sender = db.users.find((u) => u.id === message.senderId);
      return {
        ...message,
        senderDisplayName: sender?.displayName || message.senderDisplayName || "Unknown",
      };
    });

  return res.json(messages);
});

export default router;
