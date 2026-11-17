ALTER TABLE public.flashcards
  ADD COLUMN due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN interval_days INTEGER NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  ADD COLUMN ease_factor NUMERIC NOT NULL DEFAULT 2.5 CHECK (ease_factor >= 1.3),
  ADD COLUMN repetitions INTEGER NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  ADD COLUMN last_reviewed_at TIMESTAMPTZ;

CREATE TABLE public.assignment_rubrics (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  task_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  criteria JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(criteria) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.exam_roadmaps (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  exam_title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  exam_date DATE NOT NULL,
  daily_minutes INTEGER NOT NULL DEFAULT 30 CHECK (daily_minutes BETWEEN 5 AND 720),
  topics JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(topics) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.research_sources (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT NOT NULL DEFAULT '',
  published_at TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tags) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.applications (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('university', 'scholarship')),
  institution TEXT NOT NULL,
  program TEXT NOT NULL DEFAULT '',
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'researching'
    CHECK (status IN ('researching', 'preparing', 'submitted', 'accepted', 'rejected', 'waitlisted')),
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(requirements) = 'array'),
  notes TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budget_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  monthly_income NUMERIC NOT NULL DEFAULT 0 CHECK (monthly_income >= 0),
  monthly_limit NUMERIC NOT NULL DEFAULT 0 CHECK (monthly_limit >= 0),
  savings_goal NUMERIC NOT NULL DEFAULT 0 CHECK (savings_goal >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.budget_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assignment_rubrics','exam_roadmaps','research_sources','applications',
    'budget_profiles','budget_entries'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Users manage their own rows" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      t
    );
    EXECUTE format('CREATE INDEX ON public.%I (user_id)', t);
  END LOOP;
END $$;
