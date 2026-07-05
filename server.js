const express = require("express");
const cors = require("cors");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const path = require("path");
const crypto = require("crypto");

const { obfuscate, PRESETS } = require("./lib/obfuscate");

const app = express();
const PORT = process.env.PORT || 3000;

// ---- middleware ----
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({
  limits: { fileSize: 1024 * 1024 }, // 1MB max per file
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".lua")) {
      return cb(new Error("Only .lua files are accepted."));
    }
    cb(null, true);
  },
});

const obfuscateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 12, // 12 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests. Please wait a bit and try again." },
});

// ---- in-memory API keys (demo store; swap for a DB in production) ----
const apiKeys = new Map(); // key -> { createdAt }

function requireApiKeyOptional(req, res, next) {
  // API key is optional for the web dashboard, required for /api/v1/* programmatic access
  const key = req.header("x-api-key");
  if (!key || !apiKeys.has(key)) {
    return res.status(401).json({ ok: false, error: "Missing or invalid API key." });
  }
  next();
}

// ---- dashboard-facing endpoints ----
app.post("/api/obfuscate", obfuscateLimiter, async (req, res) => {
  const { code, preset } = req.body || {};
  if (!code || typeof code !== "string") {
    return res.status(400).json({ ok: false, error: "No Lua code provided." });
  }
  if (code.length > 300000) {
    return res.status(400).json({ ok: false, error: "Code is too large (max ~300KB)." });
  }
  const result = await obfuscate(code, preset);
  if (!result.ok) return res.status(500).json(result);
  res.json(result);
});

app.post("/api/obfuscate-file", obfuscateLimiter, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: "No file uploaded." });
  }
  const preset = req.body.preset;
  const source = req.file.buffer.toString("utf8");
  const result = await obfuscate(source, preset);
  if (!result.ok) return res.status(500).json(result);
  res.json({ ...result, filename: req.file.originalname.replace(/\.lua$/i, ".obf.lua") });
});

// ---- API key generation (for the API Docs page demo) ----
app.post("/api/keys", (req, res) => {
  const key = "sttar_" + crypto.randomBytes(20).toString("hex");
  apiKeys.set(key, { createdAt: Date.now() });
  res.json({ ok: true, key });
});

// ---- public/versioned API for programmatic use ----
app.post("/api/v1/obfuscate", requireApiKeyOptional, obfuscateLimiter, async (req, res) => {
  const { code, preset } = req.body || {};
  if (!code || typeof code !== "string") {
    return res.status(400).json({ ok: false, error: "No Lua code provided." });
  }
  const result = await obfuscate(code, preset);
  if (!result.ok) return res.status(500).json(result);
  res.json(result);
});

app.get("/api/presets", (req, res) => {
  res.json({ ok: true, presets: PRESETS });
});

app.get("/health", (req, res) => res.json({ ok: true }));

// fallback to dashboard for any unknown route (single-page app)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Sttar Obfuscator running on port ${PORT}`);
});
