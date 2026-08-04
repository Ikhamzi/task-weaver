import express from "express";
import cookieParser from "cookie-parser";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { tasksRouter } from "./routes/tasks.js";
import { eventsRouter } from "./routes/events.js";
import { conversationsRouter } from "./routes/conversations.js";
import { agentRouter } from "./routes/agent.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/events", eventsRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/agent", agentRouter);

app.listen(env.port, () => {
  console.log(`Aether API listening on http://localhost:${env.port}`);
});
