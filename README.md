Now copy everything below and paste it into TextEdit, then hit Cmd+S to save:

Relationship Agent
An AI-powered email relationship management agent. Type any contact's name and the agent analyzes your full email history with that person — surfacing relationship context, commitments, follow-ups, a ready-to-send draft response, and suggested meeting times.
Live App: https://email-rag-smoky.vercel.app

What It Does
Instead of spending 20-30 minutes manually reviewing emails before a meeting or follow-up, you type a contact's name and within seconds receive:

Relationship Summary — full context of your communication history
Key Topics — what you have discussed
Commitments — who owes what, and status (pending/done/unclear)
Follow-ups — specific items that need attention
Recommended Next Action — one clear thing to do right now
Draft Response — a ready-to-send email with one-click copy
Meeting Suggestion — proposed format, agenda, and available time slots
Relationship Health — at-a-glance status (Strong / Good / Needs Attention / At Risk)


Demo

Open https://email-rag-smoky.vercel.app
Type any contact's name in the search box
Click Analyze
The agent returns a full relationship brief in seconds


How to Set This Up Yourself
Prerequisites

Node.js installed (download at nodejs.org — click the LTS button)
Free accounts on: Supabase, Vercel, Anthropic Console, OpenAI Platform

Step 1 — Get the Code
git clone https://github.com/somisalami12/email-rag.git
cd email-rag
npm install
Step 2 — Set Up Supabase

Go to supabase.com and create a free account
Create a new project
Go to SQL Editor and run this:

create extension if not exists vector;

create table if not exists email_chunks (
  id           bigserial primary key,
  content      text not null,
  embedding    vector(1536),
  metadata     jsonb,
  message_id   text,
  chunk_index  int default 0,
  created_at   timestamp default now(),
  unique (message_id, chunk_index)
);

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
  select id, content, metadata,
    1 - (embedding <=> query_embedding) as similarity
  from email_chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

create index if not exists email_chunks_embedding_idx on email_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

Go to Settings → API Keys → Legacy and copy your Project URL and service_role key

Step 3 — Get API Keys

Anthropic: console.anthropic.com → API Keys → Create Key
OpenAI: platform.openai.com → API Keys → Create new secret key (add $5 credit)

Step 4 — Configure Environment
Rename .env.local.example to .env.local and fill in:
ANTHROPIC_API_KEY=your-key
OPENAI_API_KEY=your-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
Step 5 — Export Your Gmail

Go to takeout.google.com
Deselect all, then select only Mail
Download the export when Google emails you the link
Unzip and find the .mbox file

Step 6 — Load Your Emails
node --max-old-space-size=8192 scripts/ingest.mjs "/path/to/your/mail.mbox"
Wait for: Ingestion complete!
Step 7 — Run Locally
npm run dev
Open http://localhost:3000
Step 8 — Deploy to Vercel

Go to vercel.com and sign up with GitHub
Import your email-rag repository
Add your 4 environment variables
Click Deploy


Cost

Supabase: Free
Vercel: Free
Anthropic Claude: ~$0.003 per query
OpenAI embeddings: ~$1-3 one-time setup cost


Troubleshooting
"Could not analyze this contact" — Make sure emails are loaded and your .env.local keys are correct
"No space left on device" — Run TRUNCATE email_chunks; in Supabase SQL Editor then re-run ingestion
Out of memory during ingestion — Add --max-old-space-size=8192 to the node command

Tell me when you've saved it, then run the git commands to push.