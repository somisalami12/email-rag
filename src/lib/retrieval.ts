import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface EmailChunk {
  content: string;
  metadata: {
    messageId: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    chunkIndex: number;
  };
  similarity: number;
}

export async function retrieveRelevantEmails(
  query: string,
  topK = 8
): Promise<EmailChunk[]> {
  // Embed the user's query using the same model as ingestion
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const queryEmbedding = embeddingRes.data[0].embedding;

  // Vector similarity search in Supabase
  const { data, error } = await supabase.rpc("match_email_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,
    match_count: topK,
  });

  if (error) throw new Error(`Supabase search failed: ${error.message}`);

  return data as EmailChunk[];
}

export function formatChunksAsContext(chunks: EmailChunk[]): string {
  return chunks
    .map(
      (chunk, i) =>
        `--- Email ${i + 1} (similarity: ${chunk.similarity.toFixed(2)}) ---\n${chunk.content}`
    )
    .join("\n\n");
}
