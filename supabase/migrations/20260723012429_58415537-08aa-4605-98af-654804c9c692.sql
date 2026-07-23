
-- 1. Add tags array to places and wishlist_items (non-breaking, default empty)
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.wishlist_items ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- 2. Tag catalog per couple
CREATE TABLE IF NOT EXISTS public.place_tags (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  name text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique (couple_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.place_tags TO authenticated;
GRANT ALL ON public.place_tags TO service_role;

ALTER TABLE public.place_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view tags" ON public.place_tags FOR SELECT TO authenticated
  USING (public.is_in_couple(couple_id));
CREATE POLICY "members insert tags" ON public.place_tags FOR INSERT TO authenticated
  WITH CHECK (public.is_in_couple(couple_id) AND created_by = auth.uid());
CREATE POLICY "members update tags" ON public.place_tags FOR UPDATE TO authenticated
  USING (public.is_in_couple(couple_id));
CREATE POLICY "members delete tags" ON public.place_tags FOR DELETE TO authenticated
  USING (public.is_in_couple(couple_id));

-- 3. Update sync trigger function to also carry tags into places
CREATE OR REPLACE FUNCTION public.sync_wishlist_to_place()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _new_place_id uuid;
  _cat text;
BEGIN
  IF NEW.status = 'visitado' AND (OLD.status IS DISTINCT FROM 'visitado') AND NEW.linked_place_id IS NULL THEN
    _cat := COALESCE(NEW.category::text, 'restaurante');
    INSERT INTO public.places (
      couple_id, created_by, name, category, location,
      formatted_address, lat, lng, photos, visited_at, tags
    ) VALUES (
      NEW.couple_id, NEW.created_by, NEW.name, _cat::place_category, NEW.location,
      NEW.formatted_address, NEW.lat, NEW.lng, NEW.photos,
      COALESCE(NEW.planned_date, CURRENT_DATE), COALESCE(NEW.tags, '{}')
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
$function$;
