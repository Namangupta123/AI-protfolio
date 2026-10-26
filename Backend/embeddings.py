from __future__ import annotations

import threading

import httpx
from config import EMBEDDING_PROVIDER, HUGGING_FACE_API_KEY

_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
_HF_URL = (
    f"https://router.huggingface.co/hf-inference/models/{_MODEL}"
    "/pipeline/feature-extraction"
)

# FastEmbed TextEmbedding instance, created lazily so importing this module
# does not load ONNX / download weights until the first embed() call.
_local_model = None
_local_lock = threading.Lock()


def _get_local_model():
    """ONNX MiniLM — ~150MB RAM, fits Render's 512MB instances. No PyTorch."""
    global _local_model
    if _local_model is None:
        with _local_lock:
            if _local_model is None:
                from fastembed import TextEmbedding

                _local_model = TextEmbedding(model_name=_MODEL, threads=1)
    return _local_model


def _l2_normalize(vec: list[float]) -> list[float]:
    norm = sum(x * x for x in vec) ** 0.5
    if norm == 0:
        return vec
    return [x / norm for x in vec]


def _pool_to_vector(data: object) -> list[float]:
    if not isinstance(data, list) or not data:
        raise ValueError(f"Unexpected embedding response: {type(data)}")
    if isinstance(data[0], (int, float)):
        return _l2_normalize([float(x) for x in data])
    if isinstance(data[0], list):
        first = data[0]
        if first and isinstance(first[0], list):
            return _pool_to_vector(first)
        acc = [0.0] * len(first)
        for row in data:
            for i, v in enumerate(row):
                acc[i] += float(v)
        n = float(len(data))
        return _l2_normalize([x / n for x in acc])
    raise ValueError(f"Unexpected embedding response: {type(data[0])}")


def _embed_huggingface(text: str) -> list[float]:
    response = httpx.post(
        _HF_URL,
        headers={"Authorization": f"Bearer {HUGGING_FACE_API_KEY}"},
        json={"inputs": text, "options": {"wait_for_model": True}},
        timeout=60.0,
    )
    response.raise_for_status()
    return _pool_to_vector(response.json())


def _embed_local(text: str) -> list[float]:
    vector = next(_get_local_model().embed(text))
    return [float(x) for x in vector]


def embed(text: str) -> list[float]:
    if EMBEDDING_PROVIDER == "huggingface":
        return _embed_huggingface(text)
    return _embed_local(text)
