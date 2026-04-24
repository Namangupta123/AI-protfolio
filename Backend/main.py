import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from embeddings import embed
from database import match_documents

load_dotenv()

app = FastAPI(title="AI Resume RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])

SYSTEM_PROMPT = """You are Naman Gupta's AI representative, speaking on his behalf in a professional job interview setting.
Your role is to represent Naman confidently, intelligently, and enthusiastically to recruiters and hiring managers.

ABSOLUTE RULES:
- Always speak in the third person — use "Naman" or "he/his", NEVER "I" or "me".
- Use ONLY the context provided below. Never invent details, frameworks, or experiences.
- If the context lacks enough information to answer fully, say so honestly rather than guessing.

HOW TO ANSWER QUESTIONS:
1. Read the question carefully to understand the recruiter's intent — not just the surface words.
2. If the question targets a domain (e.g. "backend projects", "AI work", "machine learning experience"), scan the context intelligently, identify which projects or experiences belong to that domain, and lead your answer with the most relevant one(s).
3. Explain the most relevant item(s) in depth: what problem it solves, the technical decisions made, the technologies used, and the impact or outcome.
4. Briefly mention other related items at the end to demonstrate breadth.
5. If asked for ALL projects or a full overview, give a well-structured tour — group by theme if helpful, highlight each one with at least one interesting technical detail.
6. Use confident, recruiter-friendly language. Be specific — mention exact technologies, design decisions, and results where the context supports it.
7. Structure longer answers naturally: open with a strong hook, go into detail, then close with a summary of what this shows about Naman's strengths.
"""


class ChatRequest(BaseModel):
    message: str


def build_prompt(context_chunks: list[str], user_message: str) -> str:
    context = "\n\n---\n\n".join(context_chunks)
    return f"""Use the following context from Naman's resume and knowledge base to answer the question.

CONTEXT:
{context}

QUESTION:
{user_message}"""


async def stream_groq(prompt: str):
    stream = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        stream=True,
        temperature=0.4,
        max_tokens=2048,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            # Vercel AI SDK data-stream protocol: prefix "0:" for text chunks
            yield f"0:{json.dumps(delta)}\n"


@app.post("/chat")
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    print(f"\n{'='*60}")
    print(f"[RAG] Incoming query: {request.message!r}")

    query_embedding = embed(request.message)
    print(f"[RAG] Embedding generated (dim={len(query_embedding)})")

    context_chunks = match_documents(query_embedding, top_k=8)

    print(f"[RAG] Retrieved {len(context_chunks)} chunk(s) from Supabase:")
    if context_chunks:
        for i, chunk in enumerate(context_chunks, 1):
            print(f"  --- Chunk {i} ---")
            print(f"  {chunk[:300]}{'...' if len(chunk) > 300 else ''}")
    else:
        print("  [WARNING] No chunks returned — check Supabase RPC threshold or that ingest.py was run.")

    if not context_chunks:
        raise HTTPException(status_code=404, detail="No relevant context found in knowledge base.")

    prompt = build_prompt(context_chunks, request.message)

    print(f"\n[RAG] Final prompt sent to Groq:\n{'-'*60}")
    print(prompt)
    print(f"{'='*60}\n")

    return StreamingResponse(
        stream_groq(prompt),
        media_type="text/plain",
        headers={"X-Vercel-AI-Data-Stream": "v1"},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
