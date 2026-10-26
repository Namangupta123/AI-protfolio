"""
Ingest knowledge_base.md into Supabase, replacing any previous chunks.
Usage: python ingest.py
"""
from pathlib import Path
from langchain_text_splitters import MarkdownHeaderTextSplitter
from database import clear_documents, insert_document
from embeddings import embed
from config import KNOWLEDGE_BASE_FILE

def ingest(path: str = KNOWLEDGE_BASE_FILE) -> None:
    resolved = Path(__file__).parent / path
    text = resolved.read_text(encoding="utf-8")

    # Split by markdown headers first so each section stays semantically whole
    header_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=[
            ("#", "title"),
            ("##", "section"),
            ("###", "subsection"),
        ],
        strip_headers=False,  # keep headers in the chunk for context
    )
    header_docs = header_splitter.split_text(text)

    final_chunks: list[str] = []
    for doc in header_docs:
        breadcrumb = " > ".join(v for v in doc.metadata.values() if v)
        content = f"{breadcrumb}\n\n{doc.page_content}" if breadcrumb else doc.page_content
        final_chunks.append(content)

    print(f"Embedding {len(final_chunks)} chunks from {path} ...")

    # Embed first so a failed model/API call cannot wipe the live table.
    rows: list[tuple[str, list[float]]] = []
    for i, chunk in enumerate(final_chunks):
        embedding = embed(chunk)
        rows.append((chunk, embedding))
        print(f"  [{i + 1}/{len(final_chunks)}] embedded: {chunk[:60].strip()!r}")

    deleted = clear_documents()
    print(f"Cleared {deleted} existing document(s). Writing {len(rows)} new chunk(s) ...")

    for i, (chunk, embedding) in enumerate(rows):
        insert_document(chunk, embedding)
        print(f"  [{i + 1}/{len(rows)}] stored: {chunk[:60].strip()!r}")

    print("Done. Knowledge base rewritten in Supabase.")


if __name__ == "__main__":
    ingest()
