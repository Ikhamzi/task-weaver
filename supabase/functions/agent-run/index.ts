// Aether AI Agent — multi-tool reasoning loop using Lovable AI Gateway
// Tools: create_task, list_tasks, update_task, delete_task,
//        create_event, list_events, send_email, web_search

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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
4. When sending email, use the user's email unless they specify a different recipient.
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

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { supabase: any; userId: string; userEmail: string },
) {
  const { supabase, userId, userEmail } = ctx;
  try {
    switch (name) {
      case "create_task": {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            title: args.title,
            description: args.description ?? null,
            priority: args.priority ?? "medium",
            due_date: args.due_date ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        return { ok: true, task: data };
      }
      case "list_tasks": {
        let q = supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
        if (args.status && args.status !== "all") q = q.eq("status", args.status);
        const { data, error } = await q.limit(50);
        if (error) throw error;
        return { ok: true, tasks: data };
      }
      case "update_task": {
        const { id, ...rest } = args as any;
        const { data, error } = await supabase
          .from("tasks")
          .update(rest)
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single();
        if (error) throw error;
        return { ok: true, task: data };
      }
      case "delete_task": {
        const { error } = await supabase.from("tasks").delete().eq("id", args.id).eq("user_id", userId);
        if (error) throw error;
        return { ok: true };
      }
      case "create_event": {
        const { data, error } = await supabase
          .from("events")
          .insert({
            user_id: userId,
            title: args.title,
            description: args.description ?? null,
            location: args.location ?? null,
            start_time: args.start_time,
            end_time: args.end_time ?? null,
          })
          .select()
          .single();
        if (error) throw error;
        return { ok: true, event: data };
      }
      case "list_events": {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("user_id", userId)
          .gte("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(20);
        if (error) throw error;
        return { ok: true, events: data };
      }
      case "send_email": {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (!RESEND_API_KEY) {
          return { ok: false, error: "RESEND_API_KEY not configured" };
        }
        try {
          // Convert plain text / markdown body to simple HTML (preserve line breaks)
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
              Authorization: `Bearer ${RESEND_API_KEY}`,
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
          const j = await r.json();
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
        // Lightweight DuckDuckGo Instant Answer fallback (no API key required).
        try {
          const r = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(String(args.query))}&format=json&no_redirect=1&no_html=1`,
          );
          const j = await r.json();
          const results = (j.RelatedTopics ?? [])
            .slice(0, 5)
            .map((t: any) => ({ text: t.Text, url: t.FirstURL }))
            .filter((t: any) => t.text);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const { conversationId, message } = await req.json();
    if (!conversationId || !message) {
      return new Response(JSON.stringify({ error: "Missing conversationId or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: message,
    });

    // Fetch conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("role, content, tool_calls")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(40);

    const today = new Date().toISOString();
    const messages: any[] = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nCurrent datetime (ISO): ${today}\nUser email: ${user.email}`,
      },
      ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const toolEvents: any[] = [];
    let finalText = "";

    // Reasoning loop — up to 6 tool-call rounds
    for (let i = 0; i < 6; i++) {
      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        if (aiResp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (aiResp.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace → Usage." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        throw new Error(`AI gateway ${aiResp.status}: ${errText}`);
      }

      const aiJson = await aiResp.json();
      const choice = aiJson.choices?.[0];
      const msg = choice?.message;
      if (!msg) throw new Error("Empty AI response");

      // Push assistant message into context
      messages.push(msg);

      const toolCalls = msg.tool_calls ?? [];
      if (!toolCalls.length) {
        finalText = msg.content ?? "";
        break;
      }

      // Execute each tool call
      for (const tc of toolCalls) {
        let parsed: any = {};
        try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch { /* noop */ }
        const result = await executeTool(tc.function.name, parsed, {
          supabase, userId: user.id, userEmail: user.email!,
        });
        toolEvents.push({ tool: tc.function.name, args: parsed, result });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    if (!finalText) finalText = "Done.";

    // Save assistant message with tool log
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: finalText,
      tool_calls: toolEvents.length ? toolEvents : null,
    });

    // Bump conversation timestamp (and set title from first user msg if still default)
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return new Response(
      JSON.stringify({ reply: finalText, toolEvents }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("agent-run error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
