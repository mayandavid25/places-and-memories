ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS planned_date date,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}'::text[];