import Anthropic from "@anthropic-ai/sdk";
import { retrieveRelevantEmails, formatChunksAsContext } from "@/lib/retrieval";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { contact } = await req.json();
  let context = "";
  try {
    const chunks = await retrieveRelevantEmails(`emails from or about ${contact}`, 12);
    context = formatChunksAsContext(chunks);
  } catch (err) {
    context = "(Could not retrieve email context)";
  }
  const systemPrompt = `You are a relationship management agent. Today: ${new Date().toLocaleDateString()}. RELEVANT EMAILS:\n${context}\n\nRespond ONLY in JSON:\n{"contactName":"string","relationshipSummary":"string","keyTopics":["t1"],"commitments":[{"who":"string","what":"string","status":"pending"}],"followUps":["string"],"recommendedNextAction":"string","draftResponse":"Subject: ...\n\nBody...","relationshipHealth":"good","lastContactEstimate":"string","meetingSuggestion":{"format":"30-min call","timing":"this week","agenda":"discuss open items","suggestedSlots":["Monday morning","Wednesday afternoon","Friday morning"],"rationale":"string"}}`;
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: `Analyze my relationship with: ${contact}` }],
  });
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });
  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
// updated
