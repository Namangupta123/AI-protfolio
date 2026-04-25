import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
import {
  GuardrailEngine,
  InjectionGuard,
  ToxicityGuard,
  PIIGuard,
  DETECTION_PRESETS,
} from "@llm-guardrails/core";

const BACKEND_URL = process.env.BACKEND_URL;

const BLOCKED_MESSAGE =
  "I'm Naman's professional portfolio assistant. I can only answer questions about his skills, experience, and projects. Please keep your question on topic.";

// Module-level singleton — built once, reused across requests (avoids re-compiling patterns)
const engine = new GuardrailEngine({ prefilterMode: true }); // L1 + L2 only, no LLM calls
engine.addGuard(new InjectionGuard(DETECTION_PRESETS.standard));  // prompt injection / jailbreaks
engine.addGuard(new ToxicityGuard(DETECTION_PRESETS.standard));   // hate speech / abuse
engine.addGuard(new PIIGuard(DETECTION_PRESETS.standard));         // data leak attempts

// ── Helpers ──────────────────────────────────────────────────────────────────

// ai@6 sends UIMessage[] where text lives in parts[].text, not in .content
function extractLastUserText(
  messages: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>
): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last?.parts) return "";
  return last.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
}

// FastAPI emits the old Vercel data-stream protocol: 0:"token"\n
// TextStreamChatTransport (ai@6) expects raw plain text chunks.
function makeStripProtocolStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return source.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              controller.enqueue(encoder.encode(JSON.parse(line.slice(2)) as string));
            } catch {
              // skip malformed lines
            }
          }
        }
      },
      flush(controller) {
        if (buffer.startsWith("0:")) {
          try {
            controller.enqueue(encoder.encode(JSON.parse(buffer.slice(2)) as string));
          } catch {
            // ignore
          }
        }
      },
    })
  );
}

// Return a blocked message as a plain text stream so the UI renders it as an
// assistant reply rather than triggering the error banner.
function blockedResponse(): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(BLOCKED_MESSAGE));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const userText = extractLastUserText(messages);

    // ── Guardrail check ──────────────────────────────────────────────────────
    const guard = await engine.checkInput(userText);

    if (guard.blocked) {
      console.warn(`[guardrails] blocked by "${guard.guard}" — input: "${userText}"`);
      return blockedResponse();
    }

    // ── Forward to FastAPI RAG backend ───────────────────────────────────────
    const upstream = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText }),
    });

    if (!upstream.ok) {
      return new Response("Backend returned an error.", { status: upstream.status });
    }

    return new Response(makeStripProtocolStream(upstream.body!), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response("Could not connect to the AI backend server.", { status: 503 });
  }
}
