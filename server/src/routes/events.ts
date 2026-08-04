import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

eventsRouter.get("/", async (req, res) => {
  const from = typeof req.query.from === "string" ? req.query.from : new Date(Date.now() - 86400000).toISOString();
  const limit = Math.min(Number(req.query.limit ?? 15) || 15, 100);
  const { rows } = await pool.query(
    `SELECT * FROM events WHERE user_id = $1 AND start_time >= $2 ORDER BY start_time ASC LIMIT $3`,
    [req.user!.id, from, limit],
  );
  res.json(rows);
});

eventsRouter.post("/", async (req, res) => {
  const { title, description, location, start_time, end_time } = req.body ?? {};
  if (!title || !start_time) return res.status(400).json({ error: "title and start_time are required" });
  const { rows } = await pool.query(
    `INSERT INTO events (user_id, title, description, location, start_time, end_time)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user!.id, title, description ?? null, location ?? null, start_time, end_time ?? null],
  );
  res.status(201).json(rows[0]);
});
