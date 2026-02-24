import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import portalRoutes from "./routes/portal.js";
import gameRoutes from "./routes/games.js";

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "mathsedu-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/games", gameRoutes);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
