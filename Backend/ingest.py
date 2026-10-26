"""
Run this script once to ingest resume.md into Supabase.
Usage: python ingest.py
"""
from pathlib import Path
from langchain_text_splitters import MarkdownHeaderTextSplitter
from database import insert_document
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

    print(f"Ingesting {len(final_chunks)} chunks from {path} ...")

    for i, chunk in enumerate(final_chunks):
        embedding = embed(chunk)
        insert_document(chunk, embedding)
        print(f"  [{i + 1}/{len(final_chunks)}] stored: {chunk[:60].strip()!r}")

    print("Done. All chunks stored in Supabase.")


if __name__ == "__main__":
    ingest()
