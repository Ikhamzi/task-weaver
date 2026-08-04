import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get("/", asyncHandler(async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const limit = Math.min(Number(req.query.limit ?? 20) || 20, 100);
  const params: unknown[] = [req.user!.id];
  let sql = `SELECT * FROM tasks WHERE user_id = $1`;
  if (status && status !== "all") {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }
  params.push(limit);
  sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
}));

tasksRouter.post("/", asyncHandler(async (req, res) => {
  const { title, description, priority, due_date } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });
  const { rows } = await pool.query(
    `INSERT INTO tasks (user_id, title, description, priority, due_date)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user!.id, title, description ?? null, priority ?? "medium", due_date ?? null],
  );
  res.status(201).json(rows[0]);
}));

tasksRouter.patch("/:id", asyncHandler(async (req, res) => {
  const { title, status, priority, due_date } = req.body ?? {};
  const { rows } = await pool.query(
    `UPDATE tasks SET
       title = COALESCE($1, title),
       status = COALESCE($2, status),
       priority = COALESCE($3, priority),
       due_date = COALESCE($4, due_date)
     WHERE id = $5 AND user_id = $6 RETURNING *`,
    [title ?? null, status ?? null, priority ?? null, due_date ?? null, req.params.id, req.user!.id],
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
}));

tasksRouter.delete("/:id", asyncHandler(async (req, res) => {
  await pool.query(`DELETE FROM tasks WHERE id = $1 AND user_id = $2`, [req.params.id, req.user!.id]);
  res.status(204).end();
}));
