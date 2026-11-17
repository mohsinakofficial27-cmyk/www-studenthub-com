ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'ur', 'es', 'fr', 'de', 'ar')),
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS grading_system TEXT NOT NULL DEFAULT 'gpa4'
    CHECK (grading_system IN ('gpa4', 'gpa5', 'percentage', 'letter', 'uk')),
  ADD COLUMN IF NOT EXISTS time_zone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS date_format TEXT NOT NULL DEFAULT 'locale',
  ADD COLUMN IF NOT EXISTS time_format TEXT NOT NULL DEFAULT '12h'
    CHECK (time_format IN ('12h', '24h')),
  ADD COLUMN IF NOT EXISTS week_starts_on SMALLINT NOT NULL DEFAULT 0
    CHECK (week_starts_on IN (0, 1, 6)),
  ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN NOT NULL DEFAULT false;

INSERT INTO public.user_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
