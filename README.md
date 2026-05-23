# Command Board

A realtime command board with a TV display view (`/board`) and a phone control view (`/control`).

## Setup

### 1. Supabase table

In your Supabase project SQL editor, run:

```sql
create table board_items (
  id uuid default gen_random_uuid() primary key,
  column text not null check (column in ('objectives','tasks','goals')),
  text text not null,
  done boolean default false,
  priority text default 'none' check (priority in ('none','low','med','high')),
  created_at timestamptz default now()
);

alter table board_items enable row level security;
create policy "public read" on board_items for select using (true);
create policy "public write" on board_items for all using (true);
```

### 2. Environment variables

Edit `.env` and fill in your Supabase project values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in your Supabase dashboard under **Project Settings → API**.

### 3. Install and run

```bash
npm install
npm run dev
```

Open:
- `http://localhost:5173/board` — TV display (dark, realtime, read-only)
- `http://localhost:5173/control` — Phone control (light, add/check/delete)

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, click **Add New Project** and import the repo.
3. Add environment variables in the Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. The `vercel.json` SPA rewrite ensures both `/board` and `/control` routes work correctly.
