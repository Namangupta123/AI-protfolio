import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from groq import AsyncGroq
from config import GROQ_API_KEY, FRONTEND_URL, get_system_prompt
from embeddings import embed
from database import match_documents
from suggestions import generate_suggestions


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Warm in the background so the process can bind $PORT before the model loads.
    # Render kills services that don't listen within the start timeout.
    async def _warm():
        try:
            await asyncio.to_thread(embed, "ok")
            print("[startup] embeddings ready")
        except Exception as exc:
            print(f"[startup] embedding warmup failed: {exc}")

    task = asyncio.create_task(_warm())
    yield
    task.cancel()


app = FastAPI(title="AI Resume RAG API", lifespan=lifespan)

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


class SuggestRequest(BaseModel):
    question: str = Field(max_length=500)
    answer: str = Field(max_length=4000)
    asked: list[str] = Field(default_factory=list, max_length=30)


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


async def rag_stream(user_message: str):
    """Embed + retrieve inside the generator so HTTP headers go out immediately."""
    print(f"\n{'='*60}")
    print(f"[RAG] Incoming query: {user_message!r}")

    query_embedding = await asyncio.to_thread(embed, user_message)
    print(f"[RAG] Embedding generated (dim={len(query_embedding)})")

    context_chunks = await asyncio.to_thread(match_documents, query_embedding, 8)

    print(f"[RAG] Retrieved {len(context_chunks)} chunk(s) from Supabase:")
    if context_chunks:
        for i, chunk in enumerate(context_chunks, 1):
            print(f"  --- Chunk {i} ---")
            print(f"  {chunk[:300]}{'...' if len(chunk) > 300 else ''}")
    else:
        print("  [WARNING] No chunks returned — check Supabase RPC threshold or that ingest.py was run.")
        yield f"0:{json.dumps('No relevant context found in knowledge base.')}\n"
        return

    system_prompt = get_system_prompt()
    prompt = build_prompt(context_chunks, user_message)

    print(f"\n[RAG] Final prompt sent to Groq:\n{'-'*60}")
    print(prompt)
    print(f"{'='*60}\n")

    async for chunk in stream_groq(prompt, system_prompt):
        yield chunk


@app.post("/chat")
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    return StreamingResponse(
        rag_stream(request.message),
        media_type="text/plain",
        headers={
            "X-Vercel-AI-Data-Stream": "v1",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/suggestions")
async def suggestions(request: SuggestRequest):
    if not request.question.strip() or not request.answer.strip():
        return {"suggestions": []}

    asked = [q for q in request.asked if q.strip()]
    result = await generate_suggestions(groq_client, request.question, request.answer, asked)
    return {"suggestions": result}


@app.get("/")
async def root():
    return {"status": "ok"}


@app.get("/health")
async def health():
    return {"status": "ok"}
