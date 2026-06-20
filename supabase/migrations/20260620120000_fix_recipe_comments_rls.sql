-- Fix recipe_comments: add explicit SELECT policy per user so that
-- Supabase can resolve the profiles join after insert without relying
-- on the couple membership check failing silently mid-transaction.

DROP POLICY IF EXISTS "couple select recipe comments" ON public.recipe_comments;

CREATE POLICY "couple select recipe comments"
  ON public.recipe_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_id
        AND public.is_in_couple(r.couple_id)
    )
  );

-- Ensure the INSERT policy references auth.uid() explicitly
DROP POLICY IF EXISTS "user insert own recipe comment" ON public.recipe_comments;

CREATE POLICY "user insert own recipe comment"
  ON public.recipe_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_id
        AND public.is_in_couple(r.couple_id)
    )
  );