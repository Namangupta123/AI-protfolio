from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def clear_documents() -> int:
    """Delete every row in `documents` so a re-ingest cannot mix stale chunks."""
    client = get_supabase()
    # PostgREST refuses a filter-less DELETE; bigserial ids are always >= 1.
    result = client.table("documents").delete().gte("id", 0).execute()
    return len(result.data or [])


def insert_document(content: str, embedding: list[float]) -> None:
    client = get_supabase()
    client.table("documents").insert({
        "content": content,
        "embedding": embedding,
    }).execute()


def match_documents(query_embedding: list[float], top_k: int = 5) -> list[str]:
    client = get_supabase()
    result = client.rpc("match_documents", {
        "query_embedding": query_embedding,
        "match_count": top_k,
    }).execute()
    return [row["content"] for row in result.data]
