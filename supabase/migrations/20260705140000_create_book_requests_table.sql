-- Create book_requests table for algorithmic matching
CREATE TABLE public.book_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_title TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON public.book_requests FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own requests
CREATE POLICY "Users can insert own requests"
  ON public.book_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own requests
CREATE POLICY "Users can update own requests"
  ON public.book_requests FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own requests
CREATE POLICY "Users can delete own requests"
  ON public.book_requests FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for efficient matchmaking queries
CREATE INDEX idx_book_requests_status ON public.book_requests(status);
CREATE INDEX idx_book_requests_category ON public.book_requests(category);
CREATE INDEX idx_book_requests_title_trgm ON public.book_requests USING GIN (book_title gin_trgm_ops);

-- Enable trigram extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
