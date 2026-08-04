# Task Weaver: Migrate off Supabase/Lovable to self-hosted stack

## Steps
- [x] 1. Docker Postgres (docker-compose.yml + db/init/001_schema.sql)
- [x] 2. Express backend skeleton (server/)
- [x] 3. Google OAuth login + JWT cookie sessions
- [x] 4. Tasks/Events/Conversations CRUD routes
- [x] 5. Port AI agent to Gemini direct API (OpenAI-compatible endpoint)
- [x] 6. Rewire frontend off supabase-js onto the new REST API
- [x] 7. Delete supabase/ and lovable-tagger, update docs
- [ ] 8. User supplies GEMINI_API_KEY and Google OAuth Client ID/Secret in server/.env
- [ ] 9. End-to-end test: sign in with Google, send a chat message, confirm a task appears
