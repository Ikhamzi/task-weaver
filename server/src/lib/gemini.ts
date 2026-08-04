import { pool } from "../db.js";
import { env } from "../env.js";

const SYSTEM_PROMPT = `You are Aether, an autonomous AI task-automation agent.

You can:
- Create / list / update / delete tasks for the user
- Schedule calendar events
- Send transactional emails on behalf of the user
- Search the web for real-time information

Operating rules:
1. ALWAYS reason step-by-step. Break complex requests (e.g. "plan a trip and email me") into multiple tool calls.
2. Use tools to actually DO work — don't just describe steps, execute them.
3. When a user gives a relative date ("tomorrow", "next weekend"), resolve it to an ISO timestamp using the current date provided.
4. When sending email, use the user's email unless they specify a different recipient. NOTE: emails are sent via Resend's test sender (onboarding@resend.dev), which can ONLY deliver to the verified Resend account owner's address. If the user asks to email someone else, send it but warn that it will only arrive if that address is verified on Resend.
5. Be concise but warm. Use markdown for itineraries / lists.
6. After executing tools, give the user a clear summary of what you did.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task in the user's task list.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_date: { type: "string", description: "ISO 8601 timestamp" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List the user's tasks.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "in_progress", "done", "all"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update a task's status, title or due date.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          status: { type: "string", enum: ["pending", "in_progress", "done"] },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_date: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Delete a task by id.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Schedule a calendar event.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          location: { type: "string" },
          start_time: { type: "string", description: "ISO 8601" },
          end_time: { type: "string", description: "ISO 8601" },
        },
        required: ["title", "start_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_events",
      description: "List upcoming calendar events.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send a transactional email (mocked in this v1 — logs the email).",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string" },
          body: { type: "string", description: "Plain-text or markdown email body" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for real-time information.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
];

interface ToolCtx {
  userId: string;
}

async function executeTool(name: string, args: Record<string, unknown>, ctx: ToolCtx) {
  const { userId } = ctx;
  try {
    switch (name) {
      case "create_task": {
        const { rows } = await pool.query(
          `INSERT INTO tasks (user_id, title, description, priority, due_date)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [userId, args.title, args.description ?? null, args.priority ?? "medium", args.due_date ?? null],
        );
        return { ok: true, task: rows[0] };
      }
      case "list_tasks": {
        const status = args.status as string | undefined;
        const params: unknown[] = [userId];
        let sql = `SELECT * FROM tasks WHERE user_id = $1`;
        if (status && status !== "all") {
          params.push(status);
          sql += ` AND status = $${params.length}`;
        }
        sql += ` ORDER BY created_at DESC LIMIT 50`;
        const { rows } = await pool.query(sql, params);
        return { ok: true, tasks: rows };
      }
      case "update_task": {
        const { id, ...rest } = args as { id: string; title?: string; status?: string; priority?: string; due_date?: string };
        const { rows } = await pool.query(
          `UPDATE tasks SET
             title = COALESCE($1, title),
             status = COALESCE($2, status),
             priority = COALESCE($3, priority),
             due_date = COALESCE($4, due_date)
           WHERE id = $5 AND user_id = $6 RETURNING *`,
          [rest.title ?? null, rest.status ?? null, rest.priority ?? null, rest.due_date ?? null, id, userId],
        );
        if (!rows.length) throw new Error("Task not found");
        return { ok: true, task: rows[0] };
      }
      case "delete_task": {
        await pool.query(`DELETE FROM tasks WHERE id = $1 AND user_id = $2`, [args.id, userId]);
        return { ok: true };
      }
      case "create_event": {
        const { rows } = await pool.query(
          `INSERT INTO events (user_id, title, description, location, start_time, end_time)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [userId, args.title, args.description ?? null, args.location ?? null, args.start_time, args.end_time ?? null],
        );
        return { ok: true, event: rows[0] };
      }
      case "list_events": {
        const { rows } = await pool.query(
          `SELECT * FROM events WHERE user_id = $1 AND start_time >= now() ORDER BY start_time ASC LIMIT 20`,
          [userId],
        );
        return { ok: true, events: rows };
      }
      case "send_email": {
        if (!env.resendApiKey) {
          return { ok: false, error: "RESEND_API_KEY not configured" };
        }
        try {
          const bodyText = String(args.body ?? "");
          const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 640px; margin: 0 auto; padding: 24px;">
            ${bodyText
              .split(/\n\n+/)
              .map((p) => `<p style="margin: 0 0 16px;">${p.replace(/\n/g, "<br/>")}</p>`)
              .join("")}
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
            <p style="font-size:12px;color:#888;">Sent by Aether — your AI task agent.</p>
          </div>`;

          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Aether <onboarding@resend.dev>",
              to: [String(args.to)],
              subject: String(args.subject),
              html,
              text: bodyText,
            }),
          });
          const j = (await r.json()) as { message?: string; id?: string };
          if (!r.ok) {
            console.error("[send_email] resend error", j);
            return { ok: false, error: j?.message || `Resend ${r.status}`, details: j };
          }
          console.log("[send_email] sent", { id: j.id, to: args.to });
          return { ok: true, id: j.id, delivered_to: args.to, subject: args.subject };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
      }
      case "web_search": {
        try {
          const r = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(String(args.query))}&format=json&no_redirect=1&no_html=1`,
          );
          const j = (await r.json()) as {
            RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
            AbstractText?: string;
            Heading?: string;
          };
          const results = (j.RelatedTopics ?? [])
            .slice(0, 5)
            .map((t: { Text?: string; FirstURL?: string }) => ({ text: t.Text, url: t.FirstURL }))
            .filter((t: { text?: string }) => t.text);
          return {
            ok: true,
            query: args.query,
            abstract: j.AbstractText || j.Heading || "",
            results,
          };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      }
      default:
        return { ok: false, error: `Unknown tool ${name}` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface AgentRunResult {
  reply: string;
  toolEvents: Array<{ tool: string; args: unknown; result: unknown }>;
}

export async function runAgent(userId: string, userEmail: string, conversationId: string, message: string): Promise<AgentRunResult> {
  if (!env.geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

  await pool.query(
    `INSERT INTO messages (conversation_id, user_id, role, content) VALUES ($1, $2, 'user', $3)`,
    [conversationId, userId, message],
  );

  const { rows: history } = await pool.query(
    `SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 40`,
    [conversationId],
  );

  const today = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nCurrent datetime (ISO): ${today}\nUser email: ${userEmail}`,
    },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const toolEvents: AgentRunResult["toolEvents"] = [];
  let finalText = "";

  for (let i = 0; i < 6; i++) {
    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.geminiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-flash-latest",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      if (aiResp.status === 429) {
        throw Object.assign(new Error("Rate limit reached. Please try again in a moment."), { status: 429 });
      }
      throw new Error(`Gemini API ${aiResp.status}: ${errText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiJson: any = await aiResp.json();
    const choice = aiJson.choices?.[0];
    const msg = choice?.message;
    if (!msg) throw new Error("Empty AI response");

    messages.push(msg);

    const toolCalls = msg.tool_calls ?? [];
    if (!toolCalls.length) {
      finalText = msg.content ?? "";
      break;
    }

    for (const tc of toolCalls) {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(tc.function.arguments || "{}");
      } catch {
        /* noop */
      }
      const result = await executeTool(tc.function.name, parsed, { userId });
      toolEvents.push({ tool: tc.function.name, args: parsed, result });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  if (!finalText) finalText = "Done.";

  await pool.query(
    `INSERT INTO messages (conversation_id, user_id, role, content, tool_calls) VALUES ($1, $2, 'assistant', $3, $4)`,
    [conversationId, userId, finalText, toolEvents.length ? JSON.stringify(toolEvents) : null],
  );

  await pool.query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [conversationId]);

  return { reply: finalText, toolEvents };
}
