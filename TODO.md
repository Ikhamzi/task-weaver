# Task: Fix Supabase Email Verification (Migrate from Lovable to User's Supabase)

## Steps (Hosted Supabase: wtizrycjhqometzmcaey)

### 1. ✓ Update .env with New Supabase Project Details
- Create new project at https://supabase.com/dashboard
- Copy new `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Edit `.env`:
  ```
VITE_SUPABASE_URL="https://your-new-project.supabase.co"
  VITE_SUPABASE_PUBLISHABLE_KEY="your-new-anon-key"
**No VITE_SUPABASE_PROJECT_ID needed (CLI only)**
  ```

### 2. [ ] Configure Email Auth in New Dashboard
- https://supabase.com/dashboard/project/[new-ref]/auth/emails
- Enable 'Confirm email'
- Site URL: `http://localhost:5173`
- Redirect URL: `http://localhost:5173`
- Provider: 'Supabase' (free relay)
- Save

### 3. [ ] Restart Dev Server
```
npm install
npm run dev
```
**Note: No bun installed—use npm. Dev port: 8080 (vite.config.ts)**

### 4. [ ] Test Signup
- Go to /auth?mode=signup
- Signup with new email
- Check inbox for verification email
- Click link, login

### 5. [ ] Migrate Data (if needed)
- Use Supabase dashboard SQL or pg_dump from old project

**Progress: Emails ✓ - Schema migrate next**

### 6. ✓ Migrate Schema to New DB
```
Dashboard: https://supabase.com/dashboard/project/ndjcflsgvifxwbtuatvn/sql
New Query → Paste migration SQL → Run
```
Migration SQL (copy all):
```
[Full migration content from supabase/migrations/20260418090350_7f394415-bec3-404b-8600-853d5bacf338.sql]
```

### 7. [ ] Test Full App
- npm run dev
- Signup/verify → create task → check no 404/400 errors
