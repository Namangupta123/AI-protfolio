-- Run this in the Supabase or any other SQL Editor before ingesting data.

-- 1. Enable pgvector extension

create extension if not exists vector;

-- 2. Create the documents table

create table if not exists documents (
  id        bigserial primary key,
  content   text        not null,
  embedding vector(384) not null  -- 384 dims for all-MiniLM-L6-v2
);

-- 3. Create an IVFFlat index for fast cosine similarity search
--    (build AFTER ingesting data for best performance)

create index on documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 4. Create the match_documents function used by the RAG query

create or replace function match_documents(
  query_embedding vector(384),
  match_count     int default 3
)
returns table (
  id      bigint,
  content text,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
