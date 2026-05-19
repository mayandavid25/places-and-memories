
-- 1. couple_members table
CREATE TABLE IF NOT EXISTS public.couple_members (
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (couple_id, user_id)
);

ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a member of a couple?
CREATE OR REPLACE FUNCTION public.is_member_of(_couple_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_members
    WHERE couple_id = _couple_id AND user_id = auth.uid()
  )
$$;

-- Backfill from existing profiles.couple_id
INSERT INTO public.couple_members (couple_id, user_id)
SELECT couple_id, id FROM public.profiles
WHERE couple_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS for couple_members
CREATE POLICY "view own memberships"
  ON public.couple_members FOR SELECT
  USING (user_id = auth.uid() OR public.is_member_of(couple_id));

CREATE POLICY "insert own membership"
  ON public.couple_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete own membership"
  ON public.couple_members FOR DELETE
  USING (user_id = auth.uid());

-- 2. Replace is_in_couple to use couple_members (so user can see data from any board they are member of)
CREATE OR REPLACE FUNCTION public.is_in_couple(_couple_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couple_members
    WHERE couple_id = _couple_id AND user_id = auth.uid()
  )
$$;

-- 3. RPC: create a new couple (board) + invite, add caller as member, set as active
CREATE OR REPLACE FUNCTION public.create_new_couple(_name text DEFAULT NULL, _set_active boolean DEFAULT true)
RETURNS TABLE(couple_id uuid, invite_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _couple_id uuid;
  _code text := '';
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.couples (name) VALUES (_name) RETURNING id INTO _couple_id;
  INSERT INTO public.couple_members (couple_id, user_id) VALUES (_couple_id, _uid)
    ON CONFLICT DO NOTHING;

  FOR i IN 1..6 LOOP
    _code := _code || substr(_chars, 1 + floor(random() * length(_chars))::int, 1);
  END LOOP;

  INSERT INTO public.couple_invites (code, couple_id, created_by)
  VALUES (_code, _couple_id, _uid);

  IF _set_active THEN
    UPDATE public.profiles SET couple_id = _couple_id WHERE id = _uid;
  END IF;

  RETURN QUERY SELECT _couple_id, _code;
END;
$$;

-- 4. RPC: join couple via invite code, set as active
CREATE OR REPLACE FUNCTION public.join_couple_with_code(_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _invite record;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _invite FROM public.couple_invites
  WHERE code = upper(trim(_code))
  LIMIT 1;

  IF _invite IS NULL THEN RAISE EXCEPTION 'Código inválido'; END IF;
  IF _invite.expires_at < now() THEN RAISE EXCEPTION 'Código expirado'; END IF;

  INSERT INTO public.couple_members (couple_id, user_id) VALUES (_invite.couple_id, _uid)
    ON CONFLICT DO NOTHING;

  UPDATE public.couple_invites SET used_at = now() WHERE code = _invite.code AND used_at IS NULL;
  UPDATE public.profiles SET couple_id = _invite.couple_id WHERE id = _uid;

  RETURN _invite.couple_id;
END;
$$;

-- 5. RPC: set active couple
CREATE OR REPLACE FUNCTION public.set_active_couple(_couple_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.couple_members WHERE couple_id = _couple_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'Not a member of this space';
  END IF;
  UPDATE public.profiles SET couple_id = _couple_id WHERE id = _uid;
END;
$$;

-- 6. RPC: regenerate invite code for a couple
CREATE OR REPLACE FUNCTION public.regenerate_invite_code(_couple_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text := '';
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.couple_members WHERE couple_id = _couple_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'Not a member of this space';
  END IF;

  FOR i IN 1..6 LOOP
    _code := _code || substr(_chars, 1 + floor(random() * length(_chars))::int, 1);
  END LOOP;

  INSERT INTO public.couple_invites (code, couple_id, created_by) VALUES (_code, _couple_id, _uid);
  RETURN _code;
END;
$$;

-- 7. RPC: leave a couple (and re-pick active if needed)
CREATE OR REPLACE FUNCTION public.leave_couple(_couple_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _next uuid;
  _current uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM public.couple_members WHERE couple_id = _couple_id AND user_id = _uid;

  SELECT couple_id INTO _current FROM public.profiles WHERE id = _uid;
  IF _current = _couple_id THEN
    SELECT couple_id INTO _next FROM public.couple_members WHERE user_id = _uid ORDER BY joined_at DESC LIMIT 1;
    UPDATE public.profiles SET couple_id = _next WHERE id = _uid;
  END IF;

  RETURN _next;
END;
$$;

-- 8. RPC: reset all data of a specific couple (membership required)
CREATE OR REPLACE FUNCTION public.reset_couple_data(_couple_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.couple_members WHERE couple_id = _couple_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'Not a member of this space';
  END IF;

  DELETE FROM public.place_reviews WHERE place_id IN (SELECT id FROM public.places WHERE couple_id = _couple_id);
  DELETE FROM public.places WHERE couple_id = _couple_id;
  DELETE FROM public.wishlist_items WHERE couple_id = _couple_id;
  DELETE FROM public.events WHERE couple_id = _couple_id;
  DELETE FROM public.entertainment_reviews WHERE item_id IN (SELECT id FROM public.entertainment_items WHERE couple_id = _couple_id);
  DELETE FROM public.entertainment_items WHERE couple_id = _couple_id;
END;
$$;
