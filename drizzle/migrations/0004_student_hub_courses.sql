CREATE TABLE public.courses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  instructor TEXT NOT NULL DEFAULT '',
  credits NUMERIC NOT NULL DEFAULT 3,
  grade TEXT NOT NULL DEFAULT '',
  target_grade TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own courses"
ON public.courses
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());