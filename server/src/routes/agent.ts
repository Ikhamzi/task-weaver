import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { runAgent } from "../lib/gemini.js";

export const agentRouter = Router();
agentRouter.use(requireAuth);

agentRouter.post("/run", async (req, res) => {
  const { conversationId, message } = req.body ?? {};
  if (!conversationId || !message) {
    return res.status(400).json({ error: "Missing conversationId or message" });
  }
  try {
    const result = await runAgent(req.user!.id, req.user!.email, conversationId, message);
    res.json(result);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    console.error("agent run error:", e);
    res.status(status).json({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});
