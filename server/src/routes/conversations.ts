import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.get("/latest", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`,
    [req.user!.id],
  );
  res.json(rows[0] ?? null);
});

conversationsRouter.post("/", async (req, res) => {
  const { rows } = await pool.query(
    `INSERT INTO conversations (user_id, title) VALUES ($1, 'New conversation') RETURNING *`,
    [req.user!.id],
  );
  res.status(201).json(rows[0]);
});

conversationsRouter.get("/:id/messages", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM messages WHERE conversation_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
    [req.params.id, req.user!.id],
  );
  res.json(rows);
});
