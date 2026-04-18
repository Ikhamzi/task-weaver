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

1. Push your repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) → Import the repo.
3. **Framework preset**: Vite (auto-detected).
4. **Build command**: `npm run build`
5. **Output directory**: `dist`
6. Add **Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
7. Click **Deploy**.

After deployment, add your Vercel URL to **Supabase → Authentication → URL Configuration → Redirect URLs**.

---

## 🟣 Deploy Frontend to Render

> Render works great for static Vite sites too.

1. [dashboard.render.com](https://dashboard.render.com) → **New → Static Site**.
2. Connect your GitHub repo.
3. **Build command**: `npm install && npm run build`
4. **Publish directory**: `dist`
5. Add the same `VITE_*` environment variables as above.
6. Click **Create Static Site**.

> ⚠️ The **backend (Supabase)** doesn't need Render — edge functions run on Supabase's infrastructure. Render is only used here to host the static frontend if you prefer it over Vercel.

---

## 🧪 Try It Out

After signing up, send prompts like:

- *"Add a task to finish the report by Friday"*
- *"Schedule a meeting with Sarah tomorrow at 3pm"*
- *"Search the web for the best beaches in Goa"*
- *"Plan a weekend trip and show me the budget"*

The agent will reason, call tools, update your dashboard panels in real-time, and return a summary.

---

## ✉️ Enable Real Email Sending (Optional)

By default, the `send_email` tool **logs to console only**. To send real email:

1. Configure a verified email domain in Cloud → Emails (or use Resend).
2. Replace the mock in `supabase/functions/agent-run/index.ts` (search for `send_email`) with a real call to your email provider.
3. Redeploy the function.

---

## 🔒 Security Notes

- All tables use **Row-Level Security** — users can only access their own rows.
- The agent edge function validates the user JWT in code via `supabase.auth.getClaims()`.

---

## 📜 License

MIT

---