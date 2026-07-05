-- Add offer negotiation support to chat messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_offer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS offer_status text;

-- Restrict offer_status to the negotiation states used by the UI
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_offer_status_check'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT chat_messages_offer_status_check
      CHECK (
        offer_status IS NULL
        OR offer_status IN ('pending', 'accepted', 'rejected', 'countered')
      );
  END IF;
END
$$;

-- Helpful index for inbox and negotiation filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_offer_status
  ON public.chat_messages (offer_status);
