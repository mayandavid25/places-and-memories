
-- 1. couple_invites: restrict SELECT to members only
DROP POLICY IF EXISTS "view invites for own couple" ON public.couple_invites;
CREATE POLICY "view invites for own couple"
ON public.couple_invites
FOR SELECT
USING (public.is_in_couple(couple_id));

-- 2. couple_invites: restrict UPDATE to members of the couple
DROP POLICY IF EXISTS "update invite when joining" ON public.couple_invites;
CREATE POLICY "update invite for own couple"
ON public.couple_invites
FOR UPDATE
USING (public.is_in_couple(couple_id));

-- 3. storage photos: scope read access to couple members
DROP POLICY IF EXISTS "authed list photos" ON storage.objects;
CREATE POLICY "couple members read photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos'
  AND (storage.foldername(name))[1] = 'couples'
  AND public.is_in_couple(((storage.foldername(name))[2])::uuid)
);

-- 4. place_reviews: ensure place belongs to user's couple
DROP POLICY IF EXISTS "user insert own place review" ON public.place_reviews;
CREATE POLICY "user insert own place review"
ON public.place_reviews
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.id = place_reviews.place_id AND public.is_in_couple(p.couple_id)
  )
);

DROP POLICY IF EXISTS "user update own place review" ON public.place_reviews;
CREATE POLICY "user update own place review"
ON public.place_reviews
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.places p
    WHERE p.id = place_reviews.place_id AND public.is_in_couple(p.couple_id)
  )
);

-- 5. entertainment_reviews: ensure item belongs to user's couple
DROP POLICY IF EXISTS "user insert own ent review" ON public.entertainment_reviews;
CREATE POLICY "user insert own ent review"
ON public.entertainment_reviews
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.entertainment_items i
    WHERE i.id = entertainment_reviews.item_id AND public.is_in_couple(i.couple_id)
  )
);

DROP POLICY IF EXISTS "user update own ent review" ON public.entertainment_reviews;
CREATE POLICY "user update own ent review"
ON public.entertainment_reviews
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.entertainment_items i
    WHERE i.id = entertainment_reviews.item_id AND public.is_in_couple(i.couple_id)
  )
);

-- 6. Revoke EXECUTE on SECURITY DEFINER functions from anon (keep authenticated)
REVOKE EXECUTE ON FUNCTION public.is_in_couple(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_member_of(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_couple_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.regenerate_invite_code(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_active_couple(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_couple_with_invite(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.create_new_couple(text, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.leave_couple(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reset_couple_data(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_couple_with_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sync_wishlist_to_place() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_in_couple(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_couple_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_couple(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_couple_with_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_new_couple(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_couple(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_couple_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_couple_with_code(text) TO authenticated;
