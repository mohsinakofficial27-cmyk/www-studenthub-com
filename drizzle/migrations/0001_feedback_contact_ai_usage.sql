CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  likes text NOT NULL DEFAULT '' CHECK (char_length(likes) <= 2000),
  issues text NOT NULL DEFAULT '' CHECK (char_length(issues) <= 2000),
  wanted_feature text NOT NULL DEFAULT '' CHECK (char_length(wanted_feature) <= 2000),
  would_pay boolean NOT NULL DEFAULT false,
  fair_price text NOT NULL DEFAULT '' CHECK (char_length(fair_price) <= 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT SELECT ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT TO anon, authenticated
  WITH CHECK (NOT (user_id IS DISTINCT FROM auth.uid()));
CREATE POLICY "Admins read feedback" ON public.feedback FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send a contact message" ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (NOT (user_id IS DISTINCT FROM auth.uid()));
CREATE POLICY "Admins read contact messages" ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ai_usage (
  user_id uuid NOT NULL,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON public.ai_usage FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.consume_ai_question(_limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _used integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.ai_usage (user_id, day, count) VALUES (_uid, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET count = public.ai_usage.count + 1
    WHERE public.ai_usage.count < _limit
  RETURNING count INTO _used;
  IF _used IS NULL THEN RETURN -1; END IF;
  RETURN _limit - _used;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_ai_question(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_question(integer) TO authenticated;