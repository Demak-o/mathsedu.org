import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import portalRoutes from "./routes/portal.js";
import gameRoutes from "./routes/games.js";

const app = express();
const port = Number(process.env.PORT || 8787);

const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  "http://localhost:4173",
  "http://localhost:5173",
  "https://demak-o.github.io",
];

function isAllowedOrigin(origin) {
  const allAllowed = [...defaultAllowedOrigins, ...configuredOrigins];
  if (allAllowed.includes("*")) return true;
  if (allAllowed.includes(origin)) return true;
  // Allow GitHub Pages project URLs under the same account.
  if (/^https:\/\/demak-o\.github\.io$/i.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients may not send Origin.
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
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
