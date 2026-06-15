/**
 * Email Ingestion Script — Streaming version (handles large mbox files)
 * Run: node scripts/ingest.mjs path/to/your/gmail.mbox
 */

import fs from "fs";
import readline from "readline";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { config } from "./config.mjs";

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

const BATCH_SIZE = 20;
const MAX_CHUNK_CHARS = 1500;
const MIN_BODY_LENGTH = 50;
const MAX_EMAILS = 1000;

async function main() {
  const mboxPath = process.argv[2];
  if (!mboxPath) {
    console.error("Usage: node scripts/ingest.mjs path/to/gmail.mbox");
    process.exit(1);
  }

  console.log(`📧 Reading mbox: ${mboxPath}`);

  const emails = await parseMboxStreaming(mboxPath);
  console.log(`   Found ${emails.length} emails`);

  const chunks = emails.flatMap(chunkEmail).filter(Boolean);
  console.log(`   Created ${chunks.length} chunks`);

  console.log("🔢 Embedding and storing...");
  await embedAndStore(chunks);

  console.log("✅ Ingestion complete!");
}

// ─── Streaming Mbox Parser ────────────────────────────────────────────────────

async function parseMboxStreaming(filePath) {
  const emails = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let currentHeaders = {};
  let currentBody = [];
  let inHeaders = true;
  let isNewMessage = false;

  for await (const line of rl) {
    // New message starts with "From " at beginning of line
    if (line.startsWith("From ")) {
      // Save previous email if exists
      if (Object.keys(currentHeaders).length > 0) {
        const body = cleanEmailBody(currentBody.join("\n"));
        if (body.length >= MIN_BODY_LENGTH) {
          emails.push({
            messageId: currentHeaders["message-id"] || Math.random().toString(36),
            from: currentHeaders["from"] || "unknown",
            to: currentHeaders["to"] || "",
            subject: currentHeaders["subject"] || "(no subject)",
            date: currentHeaders["date"] || "",
            body,
          });
        }
      }
      // Reset for new message
      currentHeaders = {};
      currentBody = [];
      inHeaders = true;
      continue;
    }

    if (inHeaders) {
      if (line === "") {
        inHeaders = false;
        continue;
      }
      const match = line.match(/^([A-Za-z-]+):\s*(.*)/);
      if (match) {
        currentHeaders[match[1].toLowerCase()] = match[2];
      }
    } else {
      currentBody.push(line);
      // Cap body at 500 lines to avoid memory issues
      if (currentBody.length > 500) {
        currentBody = currentBody.slice(-200);
      }
    }
  }

  // Save last email
  if (Object.keys(currentHeaders).length > 0) {
    const body = cleanEmailBody(currentBody.join("\n"));
    if (body.length >= MIN_BODY_LENGTH) {
      emails.push({
        messageId: currentHeaders["message-id"] || Math.random().toString(36),
        from: currentHeaders["from"] || "unknown",
        to: currentHeaders["to"] || "",
        subject: currentHeaders["subject"] || "(no subject)",
        date: currentHeaders["date"] || "",
        body,
      });
    }
  }

  const limited = emails.slice(-MAX_EMAILS);
  console.log(`   Using most recent ${limited.length} emails`);
  return limited;
}

function cleanEmailBody(raw) {
  return raw
    .replace(/--[a-zA-Z0-9_-]{10,}/g, "")
    .replace(/Content-Type:.*\n/g, "")
    .replace(/Content-Transfer-Encoding:.*\n/g, "")
    .replace(/<[^>]{1,200}>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/https?:\/\/[^\s]+/g, "[link]")
    .replace(/={2,}/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Chunker ──────────────────────────────────────────────────────────────────

function chunkEmail(email) {
  const header = `From: ${email.from}\nTo: ${email.to}\nDate: ${email.date}\nSubject: ${email.subject}\n\n`;
  const full = header + email.body;

  if (full.length <= MAX_CHUNK_CHARS) {
    return [{
      content: full,
      metadata: {
        messageId: email.messageId,
        from: email.from,
        to: email.to,
        subject: email.subject,
        date: email.date,
        chunkIndex: 0,
      },
    }];
  }

  const chunks = [];
  const bodyChunks = splitIntoChunks(email.body, MAX_CHUNK_CHARS - header.length);
  bodyChunks.forEach((bodyChunk, i) => {
    chunks.push({
      content: header + bodyChunk,
      metadata: {
        messageId: email.messageId,
        from: email.from,
        to: email.to,
        subject: email.subject,
        date: email.date,
        chunkIndex: i,
        totalChunks: bodyChunks.length,
      },
    });
  });
  return chunks;
}

function splitIntoChunks(text, maxLen, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxLen, text.length);
    chunks.push(text.slice(start, end));
    start += maxLen - overlap;
  }
  return chunks;
}

// ─── Embed + Store ────────────────────────────────────────────────────────────

async function embedAndStore(chunks) {
  let stored = 0;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map((c) => c.content),
    });

    const rows = batch.map((chunk, j) => ({
      content: chunk.content,
      embedding: embeddingRes.data[j].embedding,
      metadata: chunk.metadata,
      message_id: chunk.metadata.messageId,
      chunk_index: chunk.metadata.chunkIndex,
    }));

    const { error } = await supabase.from("email_chunks").upsert(rows, {
      onConflict: "message_id,chunk_index",
    });

    if (error) {
      console.error(`Batch error:`, error.message);
    } else {
      stored += batch.length;
      process.stdout.write(`\r   Stored ${stored}/${chunks.length} chunks`);
    }

    await new Promise((r) => setTimeout(r, 200));
  }
  console.log();
}

main().catch(console.error);
