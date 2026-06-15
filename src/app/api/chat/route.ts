import Anthropic from "@anthropic-ai/sdk";
import { retrieveRelevantEmails, formatChunksAsContext } from "@/lib/retrieval";

export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { contact, mode } = await req.json();

  let context = "";
  try {
    // Search for emails related to this contact
    const chunks = await retrieveRelevantEmails(`emails from or about ${contact}`, 12);
    context = formatChunksAsContext(chunks);
  } catch (err) {
    console.error("Retrieval failed:", err);
    context = "(Could not retrieve email context)";
  }

  const systemPrompt = `You are a relationship management agent that analyzes email history to help users manage their professional relationships.

You will be given a contact name and relevant emails. Your job is to produce a structured relationship brief.

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

RELEVANT EMAILS:
${context}

Respond ONLY in this exact JSON format, no other text:
{
  "contactName": "string",
  "relationshipSummary": "2-3 sentence overview of the relationship and communication history",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "commitments": [
    {"who": "you or contact name", "what": "what was committed to", "status": "pending/done/unclear"}
  ],
  "followUps": ["specific follow-up item 1", "specific follow-up item 2"],
  "recommendedNextAction": "One clear specific action to take right now",
  "draftResponse": "A ready-to-send email draft addressing the most important outstanding item. Include subject line as first line starting with Subject:",
  "relationshipHealth": "strong/good/needs-attention/at-risk",
  "lastContactEstimate": "approximately when last email exchange was"
}`;

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

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
