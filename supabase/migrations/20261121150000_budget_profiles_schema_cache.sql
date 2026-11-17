CREATE TABLE IF NOT EXISTS public.budget_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  monthly_income NUMERIC NOT NULL DEFAULT 0 CHECK (monthly_income >= 0),
  monthly_limit NUMERIC NOT NULL DEFAULT 0 CHECK (monthly_limit >= 0),
  savings_goal NUMERIC NOT NULL DEFAULT 0 CHECK (savings_goal >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.budget_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_profiles TO authenticated;
GRANT ALL ON public.budget_profiles TO service_role;

DROP POLICY IF EXISTS "Users manage their own rows" ON public.budget_profiles;
CREATE POLICY "Users manage their own rows"
  ON public.budget_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS budget_profiles_user_id_idx
  ON public.budget_profiles (user_id);

NOTIFY pgrst, 'reload schema';

