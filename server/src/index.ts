import express from "express";
import cookieParser from "cookie-parser";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { tasksRouter } from "./routes/tasks.js";
import { eventsRouter } from "./routes/events.js";
import { conversationsRouter } from "./routes/conversations.js";
import { agentRouter } from "./routes/agent.js";

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (process kept alive):", err);
});

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/events", eventsRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/agent", agentRouter);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled route error:", err);
  // A session referencing a since-deleted user (stale cookie) — tell the client to re-auth.
  if (err?.code === "23503" && err?.constraint?.includes("user_id")) {
    return res.status(401).json({ error: "Session no longer valid, please sign in again" });
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`Aether API listening on http://localhost:${env.port}`);
});
