-- ============================================================================
-- KitabChain P2P Chat System - Supabase SQL Migrations
-- ============================================================================
-- This file contains all SQL needed to set up the chat system.
-- Execute these queries in your Supabase SQL editor.
-- ============================================================================

-- 1. Create chat_rooms table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT unique_room UNIQUE(buyer_id, seller_id, book_id)
);

-- 2. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_buyer ON public.chat_rooms(buyer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_seller ON public.chat_rooms(seller_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_book ON public.chat_rooms(book_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at);

-- 4. Enable Row Level Security (RLS) on chat_rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for chat_rooms
-- Allow users to read rooms where they are buyer or seller
CREATE POLICY "Users can read their chat rooms"
  ON public.chat_rooms
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Allow users to insert rooms (anyone authenticated can create a chat room)
CREATE POLICY "Authenticated users can create chat rooms"
  ON public.chat_rooms
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Allow users to update room timestamps
CREATE POLICY "Users can update their chat rooms"
  ON public.chat_rooms
  FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 6. Enable Row Level Security (RLS) on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for chat_messages
-- Allow users to read messages from their rooms
CREATE POLICY "Users can read messages from their rooms"
  ON public.chat_messages
  FOR SELECT
  USING (
    room_id IN (
      SELECT id FROM public.chat_rooms
      WHERE auth.uid() = buyer_id OR auth.uid() = seller_id
    )
  );

-- Allow users to insert messages into their rooms
CREATE POLICY "Users can send messages to their rooms"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    room_id IN (
      SELECT id FROM public.chat_rooms
      WHERE auth.uid() = buyer_id OR auth.uid() = seller_id
    )
    AND auth.uid() = sender_id
  );

-- ============================================================================
-- Optional: Realtime Configuration
-- ============================================================================
-- Enable realtime for chat_messages to get instant updates
-- (This is typically enabled through Supabase Dashboard, but can also be done via SQL)

-- Broadcast insert events on chat_messages
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify your setup is correct:

-- Check tables exist:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('chat_rooms', 'chat_messages');

-- Check indexes:
-- SELECT indexname FROM pg_indexes 
-- WHERE schemaname = 'public' AND tablename IN ('chat_rooms', 'chat_messages');

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename IN ('chat_rooms', 'chat_messages');

-- Check policies:
-- SELECT schemaname, tablename, policyname FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename IN ('chat_rooms', 'chat_messages');
