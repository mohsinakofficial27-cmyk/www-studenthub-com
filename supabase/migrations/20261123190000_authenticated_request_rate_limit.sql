CREATE TABLE public.authenticated_request_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count BETWEEN 1 AND 121),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.authenticated_request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.authenticated_request_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_authenticated_request()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _window_start TIMESTAMPTZ := to_timestamp(
    floor(extract(epoch FROM now()) / 60)::double precision * 60
  );
  _request_count INTEGER;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.authenticated_request_limits (
    user_id, window_started_at, request_count
  )
  VALUES (_user_id, _window_start, 1)
  ON CONFLICT (user_id) DO UPDATE
  SET window_started_at = EXCLUDED.window_started_at,
      request_count = CASE
        WHEN public.authenticated_request_limits.window_started_at = _window_start
          THEN LEAST(public.authenticated_request_limits.request_count + 1, 121)
        ELSE 1
      END,
      updated_at = now()
  RETURNING request_count INTO _request_count;

  RETURN _request_count <= 120;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_authenticated_request() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_authenticated_request() TO authenticated;

NOTIFY pgrst, 'reload schema';
