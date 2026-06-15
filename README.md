# Email RAG — Setup & Deployment Guide

Chat with your entire Gmail history using Claude + pgvector. Built with Next.js, deployed to Vercel.

---

## Architecture

```
Google Takeout (.mbox)
       │
       ▼ (run once)
Ingestion Script
├── Parse emails
├── Embed with OpenAI text-embedding-3-small
└── Store in Supabase (pgvector)
       │
       ▼ (on every query)
Next.js App (Vercel)
├── Embed user query
├── Vector search → top 8 relevant emails
├── Send emails as context to Claude
└── Stream answer back to user
```

---

## Step 1 — Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run this:

```sql
-- Enable the pgvector extension
create extension if not exists vector;

-- Create the email chunks table
create table email_chunks (
  id           bigserial primary key,
  content      text not null,
  embedding    vector(1536),       -- matches text-embedding-3-small dimensions
  metadata     jsonb,
  message_id   text,
  chunk_index  int default 0,
  created_at   timestamp default now(),
  unique (message_id, chunk_index)
);

-- Create the similarity search function
create or replace function match_email_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.3,
  match_count     int default 8
)
returns table (
  id         bigint,
  content    text,
  metadata   jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from email_chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Index for fast similarity search
create index on email_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

3. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2 — Get API Keys

- **Anthropic:** [console.anthropic.com](https://console.anthropic.com) → API Keys
- **OpenAI:** [platform.openai.com](https://platform.openai.com) → API Keys (embeddings only, very cheap)

Copy `.env.local.example` to `.env.local` and fill in all four values.

---

## Step 3 — Export Your Gmail

1. Go to [Google Takeout](https://takeout.google.com)
2. Deselect everything, then select only **Mail**
3. Choose **.mbox format**
4. Download and unzip — you'll get a file like `All mail Including Spam and Trash.mbox`

---

## Step 4 — Run Ingestion (Once)

```bash
npm install
node scripts/ingest.mjs "path/to/All mail Including Spam and Trash.mbox"
```

This will take a few minutes depending on your email volume. Progress prints to the terminal.
Cost estimate: ~$0.02 per 10,000 emails for embeddings.

---

## Step 5 — Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Step 6 — Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Redeploy with env vars
vercel --prod
```

Or connect your GitHub repo in the Vercel dashboard and it auto-deploys on push.

---

## What You Can Ask

- *"What did Sarah say about the budget in March?"*
- *"Find all emails where someone mentioned a deadline"*
- *"Summarize my conversations with the Bengal Group team"*
- *"Who have I not replied to in the last 6 months?"*
- *"What projects was I managing in Q1?"*

---

## Cost Estimate

| Service | Cost |
|---|---|
| Supabase (free tier) | $0/month (up to 500MB) |
| Vercel (hobby) | $0/month |
| OpenAI embeddings (ingestion, one-time) | ~$0.02 per 10k emails |
| Anthropic Claude (per query) | ~$0.003 per question |
| **Running total** | **~$0–3/month** |
