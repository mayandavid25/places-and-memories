
-- Events: tags, photos, participants, category, notes
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS participants text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Wishlist: private flag + linked place
ALTER TABLE public.wishlist_items
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_place_id uuid;

-- Tighten RLS on wishlist_items to enforce privacy
DROP POLICY IF EXISTS "couple select wishlist" ON public.wishlist_items;
CREATE POLICY "couple select wishlist"
  ON public.wishlist_items FOR SELECT
  USING (
    is_in_couple(couple_id)
    AND (is_private = false OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "couple update wishlist" ON public.wishlist_items;
CREATE POLICY "couple update wishlist"
  ON public.wishlist_items FOR UPDATE
  USING (
    is_in_couple(couple_id)
    AND (is_private = false OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS "couple delete wishlist" ON public.wishlist_items;
CREATE POLICY "couple delete wishlist"
  ON public.wishlist_items FOR DELETE
  USING (
    is_in_couple(couple_id)
    AND (is_private = false OR created_by = auth.uid())
  );

-- Trigger: when wishlist item becomes "visitado", create linked place automatically
CREATE OR REPLACE FUNCTION public.sync_wishlist_to_place()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_place_id uuid;
  _cat text;
BEGIN
  IF NEW.status = 'visitado' AND (OLD.status IS DISTINCT FROM 'visitado') AND NEW.linked_place_id IS NULL THEN
    _cat := COALESCE(NEW.category::text, 'restaurante');
    INSERT INTO public.places (
      couple_id, created_by, name, category, location,
      formatted_address, lat, lng, photos, visited_at
    ) VALUES (
      NEW.couple_id, NEW.created_by, NEW.name, _cat::place_category, NEW.location,
      NEW.formatted_address, NEW.lat, NEW.lng, NEW.photos, COALESCE(NEW.planned_date, CURRENT_DATE)
    )
    RETURNING id INTO _new_place_id;

    NEW.linked_place_id := _new_place_id;

    IF NEW.note IS NOT NULL AND length(trim(NEW.note)) > 0 THEN
      INSERT INTO public.place_reviews (place_id, user_id, rating, comment)
      VALUES (_new_place_id, NEW.created_by, 5, NEW.note);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_wishlist_to_place ON public.wishlist_items;
CREATE TRIGGER trg_sync_wishlist_to_place
  BEFORE UPDATE ON public.wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_wishlist_to_place();
