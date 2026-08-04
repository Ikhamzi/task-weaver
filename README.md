# Aether — AI Task Automation Assistant

Aether is a full-stack AI agent that understands natural language, breaks requests into steps, and executes them using tools (task management, calendar scheduling, email, web search).

Built with **React + Vite + Tailwind** on the frontend and a self-hosted **Express + Postgres (Docker)** backend, powered directly by **Google Gemini**.

---

## ✨ Features

- 🧠 Multi-step reasoning agent with tool-calling (up to 6 reasoning rounds)
- ✅ Task CRUD (create / list / update / delete)
- 📅 Calendar event scheduling
- 🔍 Real-time web search (DuckDuckGo)
- ✉️ Email tool (via Resend — optional, see `server/.env.example`)
- 🔐 Google OAuth login, sessions via httpOnly JWT cookie
- 💬 Chat UI with live-updating Tasks & Events side panels
- 🌙 Dark "agentic" theme with custom design system

---

## 🛠 Tech Stack

| Layer    | Tech                                                        |
| -------- | ------------------------------------------------------------|
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui       |
| Backend  | Express + TypeScript (Node), Postgres 16 (Docker)           |
| AI       | Google Gemini (`gemini-flash-latest`, direct API, OpenAI-compatible endpoint) |
| Auth     | Google OAuth 2.0                                             |

---

## 📁 Project Structure

```
.
├── src/
│   ├── components/        # ChatBubble, TasksPanel, EventsPanel, ui/
│   ├── hooks/              # useAuth
│   ├── lib/api.ts          # fetch wrapper for the backend API
│   ├── pages/              # Index, Auth, NotFound
│   ├── index.css           # Design tokens
│   └── main.tsx
├── server/                 # Express API
│   └── src/
│       ├── routes/         # auth, tasks, events, conversations, agent
│       ├── lib/gemini.ts   # AI agent reasoning loop + tools
│       └── lib/googleOAuth.ts
├── db/init/001_schema.sql  # Postgres schema, auto-applied by Docker
├── docker-compose.yml      # Postgres 16 container
└── package.json
```

---

## 🚀 Running locally

1. **Database**: `docker compose up -d` (starts Postgres on `localhost:5432`, schema auto-applied on first run).
2. **Backend**: `cd server && cp .env.example .env` (fill in `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `JWT_SECRET`), then `npm install && npm run dev` (listens on `:4000`).
3. **Frontend**: from the repo root, `npm install && npm run dev` (listens on `:8080`, proxies `/api` to the backend).
4. Open `http://localhost:8080` and sign in with Google.

### Google OAuth setup

Create an OAuth 2.0 Client ID in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Web application, with authorized redirect URI `http://localhost:4000/api/auth/google/callback` (match `GOOGLE_REDIRECT_URI` in `server/.env`).

---

## 🧪 Try It Out

After signing in, send prompts like:

- *"Add a task to finish the report by Friday"*
- *"Schedule a meeting with Sarah tomorrow at 3pm"*
- *"Search the web for the best beaches in Goa"*
- *"Plan a weekend trip and show me the budget"*

The agent will reason, call tools, update your dashboard panels in real-time, and return a summary.

---

## 🔒 Security Notes

- Every table is scoped to the authenticated user (`user_id`) at the API layer — routes never trust a client-supplied user id.
- Sessions are signed JWTs in an httpOnly cookie; the backend never exposes the cookie to client-side JS.

---

## 📜 License

MIT
