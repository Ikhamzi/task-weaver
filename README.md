# Aether — AI Task Automation Assistant

Aether is a full-stack AI agent that understands natural language, breaks requests into steps, and executes them using tools (task management, calendar scheduling, email, web search).

Built with **React + Vite + Tailwind** on the frontend and **Supabase (Postgres + Edge Functions)** on the backend, powered by Google Gemini.

---

## ✨ Features

- 🧠 Multi-step reasoning agent with tool-calling (up to 6 reasoning rounds)
- ✅ Task CRUD (create / list / update / delete)
- 📅 Calendar event scheduling
- 🔍 Real-time web search (DuckDuckGo)
- ✉️ Email tool (mocked by default — see "Enable real email" below)
- 🔐 Email + password auth with Row-Level Security
- 💬 Chat UI with live-updating Tasks & Events side panels
- 🌙 Dark "agentic" theme with custom design system

---

## 🛠 Tech Stack

| Layer    | Tech                                                     |
| -------- | -------------------------------------------------------- |
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui    |
| Backend  | Supabase (Postgres, Auth, Edge Functions on Deno)        |
| AI       | Google Gemini 2.5 Flash             |
| Hosting  | Vercel (frontend) + Supabase (backend, already deployed) |

---

## 📁 Project Structure

```
.
├── src/
│   ├── components/        # ChatBubble, TasksPanel, EventsPanel, ui/
│   ├── hooks/             # useAuth
│   ├── integrations/
│   │   └── supabase/      # client.ts, types.ts (auto-generated)
│   ├── pages/             # Index, Auth, NotFound
│   ├── index.css          # Design tokens
│   └── main.tsx
├── supabase/
│   ├── functions/
│   │   └── agent-run/     # The AI agent edge function
│   ├── migrations/        # SQL schema migrations
│   └── config.toml
├── .env
└── package.json
```


## ☁️ Deploy Frontend to Vercel
Agent Live on : https://task-weaver-pi.vercel.app/

>⚠️ The **backend (Supabase)** doesn't need Render — edge functions run on Supabase's infrastructure. Render is only used here to host the static frontend if you prefer it over Vercel.

---

## 🧪 Try It Out

After signing up, send prompts like:

- *"Add a task to finish the report by Friday"*
- *"Schedule a meeting with Sarah tomorrow at 3pm"*
- *"Search the web for the best beaches in Goa"*
- *"Plan a weekend trip and show me the budget"*

The agent will reason, call tools, update your dashboard panels in real-time, and return a summary.

---

## 🔒 Security Notes

- All tables use **Row-Level Security** — users can only access their own rows.
- The agent edge function validates the user JWT in code via `supabase.auth.getClaims()`.

---

## 📜 License

MIT

---