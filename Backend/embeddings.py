from langchain_huggingface import HuggingFaceEndpointEmbeddings
from config import HUGGING_FACE_API_KEY

_embeddings: HuggingFaceEndpointEmbeddings | None = None


def _get_embeddings() -> HuggingFaceEndpointEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEndpointEmbeddings(
            model="sentence-transformers/all-MiniLM-L6-v2",
            huggingfacehub_api_token=HUGGING_FACE_API_KEY,
        )
    return _embeddings


def embed(text: str) -> list[float]:
    return _get_embeddings().embed_query(text)
