-- Add moderation flagging columns to books_listings table
ALTER TABLE public.books_listings
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Create index for efficient moderation queries
CREATE INDEX IF NOT EXISTS idx_books_listings_is_flagged ON public.books_listings(is_flagged);
CREATE INDEX IF NOT EXISTS idx_books_listings_created_at ON public.books_listings(created_at DESC);
