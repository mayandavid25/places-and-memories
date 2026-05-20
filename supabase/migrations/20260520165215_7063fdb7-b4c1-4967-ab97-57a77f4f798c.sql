
-- Add Diversão to places enum
ALTER TYPE place_category ADD VALUE IF NOT EXISTS 'diversao';

-- Entertainment: progress + description
ALTER TABLE public.entertainment_items
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS progress_current integer,
  ADD COLUMN IF NOT EXISTS progress_total integer,
  ADD COLUMN IF NOT EXISTS progress_unit text,
  ADD COLUMN IF NOT EXISTS progress_note text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Recipe category enum
DO $$ BEGIN
  CREATE TYPE recipe_category AS ENUM ('cafe_da_manha','almoco','jantar','sobremesa','lanche','drinks','outros');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- recipes
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  category recipe_category,
  cover_url text,
  photos text[] NOT NULL DEFAULT '{}',
  planned_date date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couple select recipes" ON public.recipes FOR SELECT USING (is_in_couple(couple_id));
CREATE POLICY "couple insert recipes" ON public.recipes FOR INSERT WITH CHECK (is_in_couple(couple_id) AND created_by = auth.uid());
CREATE POLICY "couple update recipes" ON public.recipes FOR UPDATE USING (is_in_couple(couple_id));
CREATE POLICY "couple delete recipes" ON public.recipes FOR DELETE USING (is_in_couple(couple_id));

-- ingredients
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  text text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couple select ingredients" ON public.recipe_ingredients FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND is_in_couple(r.couple_id)));
CREATE POLICY "couple insert ingredients" ON public.recipe_ingredients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND is_in_couple(r.couple_id)));
CREATE POLICY "couple update ingredients" ON public.recipe_ingredients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND is_in_couple(r.couple_id)));
CREATE POLICY "couple delete ingredients" ON public.recipe_ingredients FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND is_in_couple(r.couple_id)));

-- comments
CREATE TABLE IF NOT EXISTS public.recipe_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "couple select recipe comments" ON public.recipe_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND is_in_couple(r.couple_id)));
CREATE POLICY "user insert own recipe comment" ON public.recipe_comments FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND is_in_couple(r.couple_id)));
CREATE POLICY "user delete own recipe comment" ON public.recipe_comments FOR DELETE
  USING (user_id = auth.uid());
