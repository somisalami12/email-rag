import Anthropic from "@anthropic-ai/sdk";
import { retrieveRelevantEmails, formatChunksAsContext } from "@/lib/retrieval";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { messages } = await req.json();
  const userQuery = messages[messages.length - 1].content;

  // 1. Retrieve relevant email chunks from Supabase
  let context = "";
  try {
    const chunks = await retrieveRelevantEmails(userQuery, 8);
    context = formatChunksAsContext(chunks);
  } catch (err) {
    console.error("Retrieval failed:", err);
    context = "(Could not retrieve email context — check your Supabase connection)";
  }

  // 2. Build system prompt with retrieved context
  const systemPrompt = `You are a personal email assistant with access to the user's full email history.
Answer questions based on the relevant emails provided below. Be specific — cite senders, dates, and subjects when relevant.
If the answer isn't in the provided emails, say so clearly rather than guessing.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

RELEVANT EMAILS FROM YOUR HISTORY:
${context}`;

  // 3. Stream Claude's response
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  });

  // 4. Return as a readable stream to the frontend
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
