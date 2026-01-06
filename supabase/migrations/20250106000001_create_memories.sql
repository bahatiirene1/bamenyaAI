-- Migration: Create user memories table
-- Stores facts extracted from conversations for long-term memory

CREATE TABLE public.user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Memory content
  fact TEXT NOT NULL,                    -- "User has a dog named Rocky"
  category TEXT DEFAULT 'general',       -- general, personal, work, preferences, family, etc.

  -- Metadata
  source_message_id TEXT,                -- Dify message ID where this was extracted
  confidence FLOAT DEFAULT 1.0,          -- 1.0 = explicit, 0.8 = inferred

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_referenced_at TIMESTAMPTZ,        -- When AI last used this memory

  -- Prevent duplicate facts
  UNIQUE(user_id, fact)
);

-- Enable Row Level Security
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own memories
CREATE POLICY "Users can view own memories"
  ON public.user_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON public.user_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON public.user_memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON public.user_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast retrieval
CREATE INDEX idx_user_memories_user_id ON public.user_memories(user_id);
CREATE INDEX idx_user_memories_category ON public.user_memories(category);
CREATE INDEX idx_user_memories_created_at ON public.user_memories(user_id, created_at DESC);

-- Full text search index for finding relevant memories
ALTER TABLE public.user_memories ADD COLUMN fact_search tsvector
  GENERATED ALWAYS AS (to_tsvector('english', fact)) STORED;
CREATE INDEX idx_user_memories_search ON public.user_memories USING GIN(fact_search);
