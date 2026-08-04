import crypto from "node:crypto";
import { Router } from "express";
import { env } from "../env.js";
import { pool } from "../db.js";
import { googleAuthUrl, exchangeCodeForProfile } from "../lib/googleOAuth.js";
import { signSession } from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

const isProd = env.nodeEnv === "production";

function setSessionCookie(res: import("express").Response, token: string) {
  res.cookie("aether_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

authRouter.post("/signup", async (req, res) => {
  const { email, password, first_name, last_name } = req.body ?? {};
  if (!email || !password || String(password).length < 8) {
    return res.status(400).json({ error: "Email and a password of at least 8 characters are required" });
  }

  const { rows: existing } = await pool.query(`SELECT id, password_hash FROM users WHERE email = $1`, [email]);
  if (existing.length) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name)
     VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name`,
    [email, passwordHash, first_name ?? null, last_name ?? null],
  );
  const user = rows[0];

  const token = signSession({ sub: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name });
  setSessionCookie(res, token);
  res.status(201).json(user);
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const { rows } = await pool.query(
    `SELECT id, email, password_hash, first_name, last_name FROM users WHERE email = $1`,
    [email],
  );
  const user = rows[0];
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = signSession({ sub: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name });
  setSessionCookie(res, token);
  res.json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name });
});

authRouter.get("/google", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("aether_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 5 * 60 * 1000,
  });
  res.redirect(googleAuthUrl(state));
});

authRouter.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const cookieState = req.cookies?.aether_oauth_state;
    if (!code || typeof code !== "string" || !state || state !== cookieState) {
      return res.status(400).send("Invalid OAuth state or missing code.");
    }
    res.clearCookie("aether_oauth_state");

    const profile = await exchangeCodeForProfile(code);
    if (!profile.email) {
      return res.status(400).send("Google account has no email.");
    }

    const { rows } = await pool.query(
      `INSERT INTO users (google_id, email, first_name, last_name, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (google_id) DO UPDATE
         SET email = EXCLUDED.email,
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             avatar_url = EXCLUDED.avatar_url,
             updated_at = now()
       RETURNING id, email, first_name, last_name`,
      [profile.sub, profile.email, profile.given_name ?? null, profile.family_name ?? null, profile.picture ?? null],
    );
    const user = rows[0];

    const token = signSession({ sub: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name });
    setSessionCookie(res, token);
    res.redirect(env.frontendUrl + "/");
  } catch (e) {
    console.error("google callback error:", e);
    res.status(500).send("Authentication failed.");
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie("aether_session");
  res.status(204).end();
});
