
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  photo text,
  link text,
  store text,
  estimated_value numeric(12,2),
  notes text,
  desired_date date,
  status text NOT NULL DEFAULT 'ideia' CHECK (status IN ('ideia','quero_comprar','comprado','entregue')),
  privacy text NOT NULL DEFAULT 'shared' CHECK (privacy IN ('shared','private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gifts TO authenticated;
GRANT ALL ON public.gifts TO service_role;

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gifts_select" ON public.gifts FOR SELECT TO authenticated
USING (
  public.is_member_of(couple_id)
  AND (privacy = 'shared' OR created_by = auth.uid())
);

CREATE POLICY "gifts_insert" ON public.gifts FOR INSERT TO authenticated
WITH CHECK (
  public.is_member_of(couple_id)
  AND created_by = auth.uid()
);

CREATE POLICY "gifts_update" ON public.gifts FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "gifts_delete" ON public.gifts FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE TRIGGER gifts_set_updated_at
BEFORE UPDATE ON public.gifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX gifts_couple_recipient_idx ON public.gifts(couple_id, recipient_id);
