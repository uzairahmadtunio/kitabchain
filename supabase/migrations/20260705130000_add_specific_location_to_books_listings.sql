ALTER TABLE public.books_listings
  ADD COLUMN IF NOT EXISTS specific_location text;
