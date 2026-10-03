CREATE OR REPLACE FUNCTION public.consume_ai_question(_limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _max integer := LEAST(GREATEST(_limit, 0), 15);
  _used integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _max = 0 THEN RETURN -1; END IF;
  INSERT INTO public.ai_usage (user_id, day, count) VALUES (_uid, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET count = public.ai_usage.count + 1
    WHERE public.ai_usage.count < _max
  RETURNING count INTO _used;
  IF _used IS NULL THEN RETURN -1; END IF;
  RETURN _max - _used;
END;
$$;