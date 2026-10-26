import asyncio
import json
import os
import re
from functools import lru_cache

from groq import AsyncGroq

from config import KNOWLEDGE_BASE_FILE

# Small/fast model for suggestions; override with the SUGGESTION_MODEL env var.
SUGGESTION_MODEL = os.environ.get("SUGGESTION_MODEL", "openai/gpt-oss-20b")
SUGGESTION_COUNT = 3
MAX_WORDS = 8
MAX_CHARS = 80
TIMEOUT_SECONDS = 6.0

# Fallback used when the knowledge base file cannot be read.
DEFAULT_TOPICS = ["skills", "projects", "work experience", "education", "availability"]


@lru_cache(maxsize=1)
def get_topics() -> list[str]:
    """Collect section/project/role headings from the knowledge base as topic hints."""
    try:
        with open(KNOWLEDGE_BASE_FILE, "r", encoding="utf-8") as file:
            text = file.read()
    except OSError:
        return DEFAULT_TOPICS

    topics: list[str] = []
    for line in text.splitlines():
        match = re.match(r"^#{2,3}\s+(.+?)\s*$", line)
        if match:
            topics.append(match.group(1))
    return topics or DEFAULT_TOPICS


def build_suggestion_prompt(question: str, answer: str, asked: list[str]) -> str:
    topics = "\n".join(f"- {t}" for t in get_topics())
    already_asked = "\n".join(f"- {q}" for q in asked) or "- (none)"
    return f"""A recruiter is chatting with an AI assistant about a software engineer's portfolio.

Topics the assistant can answer about:
{topics}

Latest question: {question}
Latest answer: {answer}

Questions already asked (never repeat or rephrase these):
{already_asked}

Write exactly {SUGGESTION_COUNT} short follow-up questions the recruiter might ask next.
Rules:
- Each question is at most {MAX_WORDS} words.
- Third person only (use "he" or "his"), never "you" or "I".
- Each must be answerable from the topics above and move to a different topic or detail.
- No emojis.

Respond with JSON only: {{"suggestions": ["...", "...", "..."]}}"""


def clean_suggestions(raw: object, asked: list[str]) -> list[str]:
    if not isinstance(raw, list):
        return []

    seen = {q.strip().lower() for q in asked}
    result: list[str] = []
    for item in raw:
        if not isinstance(item, str):
            continue
        text = item.strip()
        if not text or len(text) > MAX_CHARS:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(text)
        if len(result) == SUGGESTION_COUNT:
            break
    return result


async def generate_suggestions(
    client: AsyncGroq, question: str, answer: str, asked: list[str]
) -> list[str]:
    """Never raises: any failure yields an empty list so the UI simply shows no pills."""
    # Only reasoning models (gpt-oss) accept reasoning_effort
    extra = (
        {"extra_body": {"reasoning_effort": "low"}} if "gpt-oss" in SUGGESTION_MODEL else {}
    )
    try:
        completion = await asyncio.wait_for(
            client.chat.completions.create(
                model=SUGGESTION_MODEL,
                messages=[
                    {"role": "user", "content": build_suggestion_prompt(question, answer, asked)}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=600,  # headroom for reasoning tokens on gpt-oss models
                **extra,
            ),
            timeout=TIMEOUT_SECONDS,
        )
        content = completion.choices[0].message.content or ""
        parsed = json.loads(content)
        raw = parsed.get("suggestions") if isinstance(parsed, dict) else None
        return clean_suggestions(raw, asked)
    except Exception as exc:
        print(f"[suggestions] generation failed: {exc}")
        return []
