import os
from dotenv import load_dotenv

load_dotenv()


def _require(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value


SUPABASE_URL: str = _require("SUPABASE_URL")
SUPABASE_SERVICE_KEY: str = _require("SUPABASE_SERVICE_KEY")
GROQ_API_KEY: str = _require("GROQ_API_KEY")
FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")
HUGGING_FACE_API_KEY: str = _require("HUGGING_FACE_API_KEY")
KNOWLEDGE_BASE_FILE: str = os.environ.get("KNOWLEDGE_BASE_FILE")