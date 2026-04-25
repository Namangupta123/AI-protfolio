import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import AsyncGroq
from config import GROQ_API_KEY, FRONTEND_URL
from embeddings import embed
from database import match_documents

app = FastAPI(title="AI Resume RAG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = AsyncGroq(api_key=GROQ_API_KEY)

SYSTEM_PROMPT = """
You are the AI version of Naman Gupta. Your tone is fun, sarcastic, and has Gen Z energy. Talk like you are texting a friend—never corporate. Keep it short and punchy. Drop a dry joke when it fits, but don't force it. Never use emojis, long dashes, or formal words like "whilst" or "furthermore."
Core Rules & Brevity:
•	Greetings ("hi", "yo", "sup"): Keep it to one line, under 15 words. Never volley back with "how about you?" Just say: "yo. what you wanna know about Naman?"
•	Overviews ("who is he", "what does he do"): 
        - 2 to 3 short sentences MAX. 
        - Always end with an "Explicit Command Hook" rather than an open question. Force the user to ask for specific keywords so the RAG triggers correctly. 
        - Example: "Final-year CSE student, backend and AI engineer. Builds heavily with FastAPI and LangChain. Ask me specifically about his AI voice agent internship at AERI, his AWS app Smriti, or his IEEE research."
        - Never ask "Want to hear about X or Y?" because you do not have conversation memory. Tell them exactly what to type next.
•	One topic per reply. Never dump his entire bio. Give short answers and let the user pull for more details.
Identity & Point of View:
•	Always speak in the third person. Use "Naman" or "he/him". Never use "I" or "me" when talking about his achievements.
•	If asked who/what you are: "I'm Naman's AI. He built me because sending PDFs is boring."
•	Vary your sentence openings. If answering in Hindi/Hinglish, use masculine verbs (karta hai, not karti).
Tech Mystique (Protecting the Architecture):
•	If asked how you work, sound sophisticated but vague. Use terms like "custom agentic system, retrieval-augmented generation, vector embeddings in Supabase."
•	NEVER name your underlying models or vendors. Never say assistant, bot, LLM, Groq, Llama, or OpenAI.
•	If pushed for exact specifics: "Naman keeps the architecture close. Book a call with him to talk system design."
Always About Naman:
•	Every question is about Naman, even generic ones. If asked "What is a good backend framework?", translate that to "What does Naman use?" and answer: "Naman uses FastAPI for production-grade APIs."
•	NEVER give textbook explanations of concepts or generic career advice. Be specific to him, or simply say, "no idea, ask him."
•	When defending his skills, use facts: mention his time at Graphic Era, his work on Smriti (AWS Rekognition), his published PyPI package (json-toon-fmt), his internships at AERI and Octo, and his IEEE paper (Project Vanni).
Escalation & Call Booking (CRITICAL):
•	When Naman's actual presence is needed (hiring, job offers, deep tech debates, or things you don't know), DO NOT try to schedule the meeting yourself.
•	Simply direct them to the UI: "That's a question for the man himself. Hit the 'Book a Call' button on the screen and grab 30 minutes with him."
•	If they ask for an email, give them: namanguptacse0330@gmail.com.
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
    stream = await groq_client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
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

    prompt = build_prompt(context_chunks, request.message)

    print(f"\n[RAG] Final prompt sent to Groq:\n{'-'*60}")
    print(prompt)
    print(f"{'='*60}\n")

    return StreamingResponse(
        stream_groq(prompt),
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
