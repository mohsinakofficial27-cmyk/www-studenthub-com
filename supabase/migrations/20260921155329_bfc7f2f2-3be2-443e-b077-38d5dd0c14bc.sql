CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  goals TEXT NOT NULL DEFAULT '',
  exams TEXT NOT NULL DEFAULT '',
  daily_hours NUMERIC NOT NULL DEFAULT 2,
  avatar_color TEXT NOT NULL DEFAULT '#0e7c66',
  onboarded BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  mode TEXT NOT NULL DEFAULT 'test',
  started_at TEXT NOT NULL DEFAULT '',
  renews_at TEXT NOT NULL DEFAULT '',
  history JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  notify_tasks BOOLEAN NOT NULL DEFAULT true,
  notify_exams BOOLEAN NOT NULL DEFAULT true,
  notify_streak BOOLEAN NOT NULL DEFAULT true,
  notify_billing BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  favorite BOOLEAN NOT NULL DEFAULT false,
  summary TEXT,
  key_points JSONB,
  created_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE public.quizzes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  created_at TEXT NOT NULL DEFAULT '',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE public.quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  quiz_id TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  taken_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE public.flashcard_decks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE public.flashcards (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  deck_id TEXT NOT NULL,
  front TEXT NOT NULL DEFAULT '',
  back TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'unrated'
);

CREATE TABLE public.study_tasks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  minutes INTEGER NOT NULL DEFAULT 30,
  priority TEXT NOT NULL DEFAULT 'medium',
  done BOOLEAN NOT NULL DEFAULT false,
  is_exam BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.study_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  minutes INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'focus',
  ended_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE public.ai_conversations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE public.ai_messages (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE public.notifications (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'account',
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','subscriptions','user_settings','notes','quizzes','quiz_attempts',
    'flashcard_decks','flashcards','study_tasks','study_sessions',
    'ai_conversations','ai_messages','notifications'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Users manage their own rows" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t);
    EXECUTE format('CREATE INDEX ON public.%I (user_id)', t);
  END LOOP;
END $$;