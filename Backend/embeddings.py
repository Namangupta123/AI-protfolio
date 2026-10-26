from langchain_huggingface import HuggingFaceEmbeddings, HuggingFaceEndpointEmbeddings
from config import EMBEDDING_PROVIDER, HUGGING_FACE_API_KEY

_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
_embeddings: HuggingFaceEmbeddings | HuggingFaceEndpointEmbeddings | None = None


def _get_embeddings() -> HuggingFaceEmbeddings | HuggingFaceEndpointEmbeddings:
    global _embeddings
    if _embeddings is None:
        if EMBEDDING_PROVIDER == "huggingface":
            _embeddings = HuggingFaceEndpointEmbeddings(
                model=_MODEL,
                huggingfacehub_api_token=HUGGING_FACE_API_KEY,
            )
        else:
            _embeddings = HuggingFaceEmbeddings(
                model_name=_MODEL,
                model_kwargs={"device": "cpu"},
            )
    return _embeddings


def embed(text: str) -> list[float]:
    return _get_embeddings().embed_query(text)
