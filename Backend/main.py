import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import AsyncGroq
from config import GROQ_API_KEY, FRONTEND_URL, SYSTEM_PROMPT_FILE
from embeddings import embed
from database import match_documents
from config import get_system_prompt

app = FastAPI(title="AI Resume RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = AsyncGroq(api_key=GROQ_API_KEY)


class ChatRequest(BaseModel):
    message: str


def build_prompt(context_chunks: list[str], user_message: str) -> str:
    context = "\n\n---\n\n".join(context_chunks)
    return f"""Use the following context from resume and knowledge base to answer the question.

CONTEXT:
{context}

QUESTION:
{user_message}"""


async def stream_groq(prompt: str, system_prompt: str):
    stream = await groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        stream=True,
        temperature=0.4,
        max_tokens=2048,
    )
    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
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

    system_prompt = get_system_prompt()
    prompt = build_prompt(context_chunks, request.message)

    print(f"\n[RAG] Final prompt sent to Groq:\n{'-'*60}")
    print(prompt)
    print(f"{'='*60}\n")

    return StreamingResponse(
        stream_groq(prompt, system_prompt),
        media_type="text/plain",
        headers={
            "X-Vercel-AI-Data-Stream": "v1",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}
