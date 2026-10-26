from functools import lru_cache
import os
from dotenv import load_dotenv

load_dotenv()


def _require(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value

# Required environment variables
SUPABASE_URL: str = _require("SUPABASE_URL")
SUPABASE_SERVICE_KEY: str = _require("SUPABASE_SERVICE_KEY")
GROQ_API_KEY: str = _require("GROQ_API_KEY")
KNOWLEDGE_BASE_FILE: str = _require("KNOWLEDGE_BASE_FILE")
SYSTEM_PROMPT_FILE: str = _require("SYSTEM_PROMPT_FILE")

# Optional environment variables with defaults
FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")
CUSTOM_SYSTEM_PROMPT: str = os.environ.get("CUSTOM_SYSTEM_PROMPT", "")
EMBEDDING_PROVIDER: str = os.environ.get("EMBEDDING_PROVIDER", "local").strip().lower()
HUGGING_FACE_API_KEY: str = os.environ.get("HUGGING_FACE_API_KEY", "")

if EMBEDDING_PROVIDER not in {"local", "huggingface"}:
    raise RuntimeError(
        "EMBEDDING_PROVIDER must be 'local' or 'huggingface', "
        f"got {EMBEDDING_PROVIDER!r}"
    )
if EMBEDDING_PROVIDER == "huggingface" and not HUGGING_FACE_API_KEY:
    raise RuntimeError(
        "HUGGING_FACE_API_KEY is required when EMBEDDING_PROVIDER=huggingface"
    )

# Cached function to load system prompt, with support for custom prompt via environment variable
@lru_cache(maxsize=2) 
def get_system_prompt() -> str:
    if CUSTOM_SYSTEM_PROMPT:
        return CUSTOM_SYSTEM_PROMPT

    try:
        with open(SYSTEM_PROMPT_FILE, "r", encoding="utf-8") as file:
            return file.read()
    except FileNotFoundError:
        return "You are a helpful AI assistant."
