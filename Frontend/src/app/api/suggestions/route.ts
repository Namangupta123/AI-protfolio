import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, "");

const MAX_QUESTION = 500;
const MAX_ANSWER = 4000;
const MAX_ASKED = 30;

// Suggestions are a nice-to-have: every failure path returns an empty list
// so the UI simply shows no pills.
const empty = () => NextResponse.json({ suggestions: [] });

export async function POST(req: NextRequest) {
  try {
    if (!BACKEND_URL) return empty();

    const body = await req.json();
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
    const asked: string[] = Array.isArray(body?.asked)
      ? body.asked.filter((q: unknown): q is string => typeof q === "string").slice(-MAX_ASKED)
      : [];

    if (!question || !answer) return empty();
    if (question.length > MAX_QUESTION || answer.length > MAX_ANSWER) return empty();

    const upstream = await fetch(`${BACKEND_URL}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, asked }),
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return empty();

    const data = await upstream.json();
    const suggestions: string[] = Array.isArray(data?.suggestions)
      ? data.suggestions.filter((s: unknown): s is string => typeof s === "string").slice(0, 3)
      : [];
    return NextResponse.json({ suggestions });
  } catch {
    return empty();
  }
}
