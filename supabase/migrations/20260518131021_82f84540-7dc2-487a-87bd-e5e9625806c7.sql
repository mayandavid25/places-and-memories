
CREATE OR REPLACE FUNCTION public.create_couple_with_invite(_name text DEFAULT NULL)
RETURNS TABLE(couple_id uuid, invite_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _couple_id uuid;
  _code text;
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.couples (name) VALUES (_name) RETURNING id INTO _couple_id;

  UPDATE public.profiles SET couple_id = _couple_id WHERE id = _uid;

  _code := '';
  FOR i IN 1..6 LOOP
    _code := _code || substr(_chars, 1 + floor(random() * length(_chars))::int, 1);
  END LOOP;

  INSERT INTO public.couple_invites (code, couple_id, created_by)
  VALUES (_code, _couple_id, _uid);

  RETURN QUERY SELECT _couple_id, _code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_couple_with_invite(text) TO authenticated;
