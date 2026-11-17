
-- -----------------------------------------------------------------------------
-- Source migration: 20260921155329_bfc7f2f2-3be2-443e-b077-38d5dd0c14bc.sql
-- Apply only once to a fresh Supabase project.
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Source migration: 20260923131911_d9e9a6ad-32d4-40a8-a5fb-901f2990196e.sql
-- Apply only once to a fresh Supabase project.
-- -----------------------------------------------------------------------------

-- Subscription entitlement must be decided server-side only.
DROP POLICY IF EXISTS "Users manage their own rows" ON public.subscriptions;

CREATE POLICY "Users can read their own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- -----------------------------------------------------------------------------
-- Source migration: 20261116120000_user_preferences.sql
-- Apply only once to a fresh Supabase project.
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- Source migration: 20261116130000_community.sql
-- Apply only once to a fresh Supabase project.
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  subject TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.study_group_members (
  group_id UUID NOT NULL REFERENCES public.study_groups ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE public.study_group_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.group_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 10 AND 600),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.group_study_session_attendees (
  session_id UUID NOT NULL REFERENCES public.group_study_sessions ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE public.tutoring_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  subjects TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 1000),
  format TEXT NOT NULL DEFAULT 'online' CHECK (format IN ('online', 'in_person', 'either')),
  active BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(subjects) <= 20)
);

CREATE TABLE public.tutoring_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (tutor_id <> student_id)
);

CREATE TABLE public.progress_share_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '{"progress":true}'::jsonb
    CHECK (jsonb_typeof(scopes) = 'object'),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.progress_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  scopes JSONB NOT NULL DEFAULT '{"progress":true}'::jsonb
    CHECK (jsonb_typeof(scopes) = 'object'),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  CHECK (owner_id <> recipient_id),
  UNIQUE (owner_id, recipient_id)
);

CREATE TABLE public.group_shared_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('note', 'flashcard_deck')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  CHECK (pg_column_size(snapshot) <= 500000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE public.group_shared_resource_imports (
  share_id UUID NOT NULL REFERENCES public.group_shared_resources ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  imported_resource_id TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (share_id, user_id)
);

CREATE INDEX study_group_members_user_id_idx ON public.study_group_members(user_id);
CREATE INDEX study_group_invitations_group_id_idx ON public.study_group_invitations(group_id);
CREATE INDEX group_study_sessions_group_id_idx ON public.group_study_sessions(group_id, starts_at);
CREATE INDEX tutoring_requests_tutor_id_idx ON public.tutoring_requests(tutor_id, created_at DESC);
CREATE INDEX progress_shares_recipient_idx ON public.progress_shares(recipient_id);
CREATE INDEX group_shared_resources_group_idx ON public.group_shared_resources(group_id, created_at DESC);

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_study_session_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoring_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoring_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_share_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_shared_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_shared_resource_imports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.study_groups, public.study_group_members,
  public.study_group_invitations, public.group_study_sessions,
  public.group_study_session_attendees, public.tutoring_profiles,
  public.tutoring_requests, public.progress_share_invitations,
  public.progress_shares, public.group_shared_resources FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.group_shared_resource_imports FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.is_study_group_member(_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE group_id = _group_id AND user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.is_study_group_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_study_group_member(UUID) TO authenticated;

CREATE POLICY study_groups_member_read ON public.study_groups
  FOR SELECT TO authenticated
  USING (public.is_study_group_member(id));
CREATE POLICY group_members_member_read ON public.study_group_members
  FOR SELECT TO authenticated
  USING (public.is_study_group_member(group_id));
CREATE POLICY group_sessions_member_read ON public.group_study_sessions
  FOR SELECT TO authenticated
  USING (public.is_study_group_member(group_id));
CREATE POLICY group_attendees_member_read ON public.group_study_session_attendees
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.group_study_sessions s
    WHERE s.id = group_study_session_attendees.session_id
      AND public.is_study_group_member(s.group_id)
  ));
CREATE POLICY tutoring_profiles_owner_manage ON public.tutoring_profiles
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY progress_shares_party_read ON public.progress_shares
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid()));
CREATE POLICY group_shared_resources_member_read ON public.group_shared_resources
  FOR SELECT TO authenticated
  USING (
    revoked_at IS NULL
    AND public.is_study_group_member(group_id)
  );
CREATE POLICY group_resource_imports_owner_read ON public.group_shared_resource_imports
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.create_study_group(_name TEXT, _subject TEXT, _description TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE _group_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.study_groups(name, subject, description, owner_id)
  VALUES (btrim(_name), btrim(coalesce(_subject, '')), btrim(coalesce(_description, '')), auth.uid())
  RETURNING id INTO _group_id;
  INSERT INTO public.study_group_members(group_id, user_id, role)
  VALUES (_group_id, auth.uid(), 'owner');
  RETURN _group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_invitation(_group_id UUID, _expires_hours INTEGER DEFAULT 72)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  _token TEXT := encode(extensions.gen_random_bytes(32), 'hex');
  _role TEXT;
BEGIN
  SELECT role INTO _role FROM public.study_group_members
  WHERE group_id = _group_id AND user_id = auth.uid();
  IF _role IS NULL OR _role NOT IN ('owner', 'admin') THEN RAISE EXCEPTION 'Group administrator permission required'; END IF;
  IF _expires_hours < 1 OR _expires_hours > 720 THEN RAISE EXCEPTION 'Invalid invitation lifetime'; END IF;
  INSERT INTO public.study_group_invitations(group_id, inviter_id, token_hash, expires_at)
  VALUES (_group_id, auth.uid(), encode(extensions.digest(convert_to(_token, 'UTF8'), 'sha256'), 'hex'),
          now() + make_interval(hours => _expires_hours));
  RETURN _token;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_group_invitation(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE _group_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT group_id INTO _group_id FROM public.study_group_invitations
  WHERE token_hash = encode(extensions.digest(convert_to(_token, 'UTF8'), 'sha256'), 'hex')
    AND revoked_at IS NULL AND expires_at > now();
  IF _group_id IS NULL THEN RAISE EXCEPTION 'Invitation is invalid, expired, or revoked'; END IF;
  INSERT INTO public.study_group_members(group_id, user_id, role)
  VALUES (_group_id, auth.uid(), 'member') ON CONFLICT DO NOTHING;
  RETURN _group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_group_invitation(_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.study_group_invitations i SET revoked_at = now()
  WHERE i.id = _invitation_id AND i.revoked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.study_group_members m
      WHERE m.group_id = i.group_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    );
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_study_group(_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE _role TEXT;
BEGIN
  SELECT role INTO _role FROM public.study_group_members
  WHERE group_id = _group_id AND user_id = auth.uid();
  IF _role IS NULL THEN RETURN FALSE; END IF;
  IF _role = 'owner' THEN RAISE EXCEPTION 'Transfer ownership or delete the group before leaving'; END IF;
  DELETE FROM public.study_group_members WHERE group_id = _group_id AND user_id = auth.uid();
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_group_member(_group_id UUID, _member_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  _actor_role TEXT;
  _target_role TEXT;
BEGIN
  SELECT role INTO _actor_role FROM public.study_group_members
  WHERE group_id = _group_id AND user_id = auth.uid();
  SELECT role INTO _target_role FROM public.study_group_members
  WHERE group_id = _group_id AND user_id = _member_id;
  IF _actor_role IS NULL OR _target_role IS NULL THEN RETURN FALSE; END IF;
  IF _target_role = 'owner' OR (_actor_role = 'admin' AND _target_role = 'admin')
     OR _actor_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Cannot remove this group member';
  END IF;
  DELETE FROM public.study_group_members WHERE group_id = _group_id AND user_id = _member_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_group_study_session(
  _group_id UUID, _title TEXT, _starts_at TIMESTAMPTZ, _duration_minutes INTEGER
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE _session_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = _group_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Group membership required';
  END IF;
  IF _starts_at < now() - interval '1 minute' THEN RAISE EXCEPTION 'Session must be scheduled in the future'; END IF;
  INSERT INTO public.group_study_sessions(group_id, created_by, title, starts_at, duration_minutes)
  VALUES (_group_id, auth.uid(), btrim(_title), _starts_at, _duration_minutes)
  RETURNING id INTO _session_id;
  INSERT INTO public.group_study_session_attendees(session_id, user_id)
  VALUES (_session_id, auth.uid());
  RETURN _session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_group_study_session(_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.group_study_session_attendees(session_id, user_id)
  SELECT s.id, auth.uid() FROM public.group_study_sessions s
  JOIN public.study_group_members m ON m.group_id = s.group_id AND m.user_id = auth.uid()
  WHERE s.id = _session_id AND s.starts_at + make_interval(mins => s.duration_minutes) > now()
  ON CONFLICT DO NOTHING;
  IF NOT FOUND AND NOT EXISTS (
    SELECT 1 FROM public.group_study_session_attendees WHERE session_id = _session_id AND user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Session unavailable or group membership required'; END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_group_study_session(_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.group_study_session_attendees
  WHERE session_id = _session_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.browse_tutors()
RETURNS TABLE(listing_id UUID, display_name TEXT, subjects TEXT[], bio TEXT, format TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT t.id, t.display_name, t.subjects, t.bio, t.format
  FROM public.tutoring_profiles t
  WHERE t.active AND t.user_id <> auth.uid()
  ORDER BY t.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.save_tutoring_profile(
  _display_name TEXT, _subjects TEXT[], _bio TEXT, _format TEXT, _active BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.tutoring_profiles(user_id, display_name, subjects, bio, format, active, updated_at)
  VALUES (auth.uid(), btrim(_display_name),
    (SELECT coalesce(array_agg(DISTINCT btrim(value)), '{}') FROM unnest(_subjects) AS subjects(value) WHERE btrim(value) <> ''),
    btrim(coalesce(_bio, '')), _format, _active, now())
  ON CONFLICT (user_id) DO UPDATE SET display_name = excluded.display_name,
    subjects = excluded.subjects, bio = excluded.bio, format = excluded.format,
    active = excluded.active, updated_at = now();
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_tutoring(_listing_id UUID, _message TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  _tutor_id UUID;
  _request_id UUID;
BEGIN
  SELECT user_id INTO _tutor_id FROM public.tutoring_profiles
  WHERE id = _listing_id AND active;
  IF auth.uid() IS NULL OR auth.uid() = _tutor_id THEN RAISE EXCEPTION 'Invalid tutoring request'; END IF;
  IF _tutor_id IS NULL THEN
    RAISE EXCEPTION 'Tutor listing is no longer available';
  END IF;
  INSERT INTO public.tutoring_requests(tutor_id, student_id, message)
  VALUES (_tutor_id, auth.uid(), btrim(_message))
  RETURNING id INTO _request_id;
  RETURN _request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_tutoring_requests()
RETURNS TABLE(id UUID, direction TEXT, other_name TEXT, message TEXT, status TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT r.id,
    CASE WHEN r.tutor_id = auth.uid() THEN 'received' ELSE 'sent' END,
    coalesce(p.name, 'Student'),
    r.message,
    r.status,
    r.created_at
  FROM public.tutoring_requests r
  JOIN public.profiles p ON p.user_id = CASE WHEN r.tutor_id = auth.uid() THEN r.student_id ELSE r.tutor_id END
  WHERE r.tutor_id = auth.uid() OR r.student_id = auth.uid()
  ORDER BY r.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.respond_tutoring_request(_request_id UUID, _accept BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.tutoring_requests SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END
  WHERE id = _request_id AND tutor_id = auth.uid() AND status = 'pending';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_progress_share_invitation(
  _recipient_email TEXT, _scopes JSONB, _expires_hours INTEGER DEFAULT 168
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE _token TEXT := encode(extensions.gen_random_bytes(32), 'hex');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF lower(btrim(_recipient_email)) = lower(coalesce(auth.jwt() ->> 'email', '')) THEN
    RAISE EXCEPTION 'You cannot share progress with yourself';
  END IF;
  IF _expires_hours < 1 OR _expires_hours > 720 THEN RAISE EXCEPTION 'Invalid invitation lifetime'; END IF;
  IF jsonb_typeof(_scopes) <> 'object'
     OR coalesce((_scopes ->> 'progress')::boolean, false) IS NOT TRUE
     OR (_scopes - 'progress') <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid sharing permissions';
  END IF;
  INSERT INTO public.progress_share_invitations(owner_id, recipient_email, token_hash, scopes, expires_at)
  VALUES (auth.uid(), lower(btrim(_recipient_email)),
          encode(extensions.digest(convert_to(_token, 'UTF8'), 'sha256'), 'hex'),
          _scopes, now() + make_interval(hours => _expires_hours));
  RETURN _token;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_progress_share_invitation(_token TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  _invite public.progress_share_invitations%ROWTYPE;
  _share_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO _invite FROM public.progress_share_invitations
  WHERE token_hash = encode(extensions.digest(convert_to(_token, 'UTF8'), 'sha256'), 'hex')
    AND revoked_at IS NULL AND expires_at > now()
    AND recipient_email = lower(coalesce(auth.jwt() ->> 'email', ''));
  IF _invite.id IS NULL THEN RAISE EXCEPTION 'Invitation is invalid, expired, revoked, or addressed to another account'; END IF;
  INSERT INTO public.progress_shares(owner_id, recipient_id, scopes)
  VALUES (_invite.owner_id, auth.uid(), _invite.scopes)
  ON CONFLICT (owner_id, recipient_id) DO UPDATE SET
    scopes = excluded.scopes, accepted_at = now(), revoked_at = NULL
  RETURNING id INTO _share_id;
  UPDATE public.progress_share_invitations SET revoked_at = now() WHERE id = _invite.id;
  RETURN coalesce(_share_id, (
    SELECT id FROM public.progress_shares WHERE owner_id = _invite.owner_id AND recipient_id = auth.uid() AND revoked_at IS NULL
  ));
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_progress_share(_share_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.progress_shares SET revoked_at = now()
  WHERE id = _share_id AND owner_id = auth.uid() AND revoked_at IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_progress_share_invitation(_invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.progress_share_invitations SET revoked_at = now()
  WHERE id = _invitation_id AND owner_id = auth.uid() AND revoked_at IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_progress(_share_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  _share public.progress_shares%ROWTYPE;
  _result JSONB;
BEGIN
  SELECT * INTO _share FROM public.progress_shares
  WHERE id = _share_id AND recipient_id = auth.uid() AND revoked_at IS NULL;
  IF _share.id IS NULL THEN RAISE EXCEPTION 'Share unavailable'; END IF;
  IF coalesce((_share.scopes ->> 'progress')::boolean, false) THEN
    SELECT jsonb_build_object(
      'display_name', p.name,
      'courses', (SELECT count(*) FROM public.courses c WHERE c.user_id = _share.owner_id),
      'tasks_completed', (SELECT count(*) FROM public.study_tasks t WHERE t.user_id = _share.owner_id AND t.done),
      'study_minutes', (SELECT coalesce(sum(s.minutes), 0) FROM public.study_sessions s WHERE s.user_id = _share.owner_id AND s.kind = 'focus'),
      'recent_quiz_average', (
        SELECT CASE WHEN count(*) = 0 THEN NULL ELSE round(avg(a.score::numeric / nullif(a.total, 0) * 100), 1) END
        FROM public.quiz_attempts a WHERE a.user_id = _share.owner_id AND a.total > 0
      )
    ) INTO _result FROM public.profiles p WHERE p.user_id = _share.owner_id;
  ELSE
    _result := '{}'::jsonb;
  END IF;
  RETURN coalesce(_result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.share_group_resource(
  _group_id UUID, _resource_type TEXT, _resource_id TEXT, _permission TEXT DEFAULT 'view'
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  _title TEXT;
  _snapshot JSONB;
  _share_id UUID;
BEGIN
  IF _permission NOT IN ('view', 'edit') OR _resource_type NOT IN ('note', 'flashcard_deck') THEN
    RAISE EXCEPTION 'Invalid share type or permission';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.study_group_members WHERE group_id = _group_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Group membership required';
  END IF;
  IF _resource_type = 'note' THEN
    SELECT title, to_jsonb(n) - 'user_id' - 'id' INTO _title, _snapshot FROM public.notes n
    WHERE n.id = _resource_id AND n.user_id = auth.uid();
  ELSE
    SELECT d.name, jsonb_build_object(
      'deck', to_jsonb(d) - 'user_id' - 'id',
      'cards', coalesce((SELECT jsonb_agg(to_jsonb(c) - 'user_id' - 'deck_id' - 'id') FROM public.flashcards c
        WHERE c.deck_id = d.id AND c.user_id = auth.uid()), '[]'::jsonb)
    ) INTO _title, _snapshot FROM public.flashcard_decks d
    WHERE d.id = _resource_id AND d.user_id = auth.uid();
  END IF;
  IF _snapshot IS NULL THEN RAISE EXCEPTION 'Resource not found or not owned by you'; END IF;
  INSERT INTO public.group_shared_resources(group_id, owner_id, resource_type, title, permission, snapshot)
  VALUES (_group_id, auth.uid(), _resource_type, _title, _permission, _snapshot)
  RETURNING id INTO _share_id;
  RETURN _share_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.edit_group_shared_resource(_share_id UUID, _snapshot JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.group_shared_resources r SET snapshot = _snapshot
  WHERE r.id = _share_id AND r.permission = 'edit' AND r.revoked_at IS NULL
    AND EXISTS (SELECT 1 FROM public.study_group_members m WHERE m.group_id = r.group_id AND m.user_id = auth.uid());
  IF NOT FOUND THEN RAISE EXCEPTION 'Editable share unavailable'; END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_group_shared_resource(_share_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  _resource public.group_shared_resources%ROWTYPE;
  _new_id TEXT := gen_random_uuid()::text;
  _card JSONB;
  _existing_id TEXT;
BEGIN
  SELECT r.* INTO _resource FROM public.group_shared_resources r
  JOIN public.study_group_members m ON m.group_id = r.group_id AND m.user_id = auth.uid()
  WHERE r.id = _share_id AND r.revoked_at IS NULL;
  IF _resource.id IS NULL THEN RAISE EXCEPTION 'Shared resource unavailable'; END IF;
  SELECT imported_resource_id INTO _existing_id
  FROM public.group_shared_resource_imports
  WHERE share_id = _share_id AND user_id = auth.uid();
  IF _existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('type', _resource.resource_type, 'id', _existing_id, 'already_imported', TRUE);
  END IF;
  IF _resource.resource_type = 'note' THEN
    INSERT INTO public.notes(id, user_id, title, content, subject, favorite, summary, key_points, created_at, updated_at)
    VALUES (_new_id, auth.uid(), _resource.snapshot ->> 'title',
      coalesce(_resource.snapshot ->> 'content', ''), coalesce(_resource.snapshot ->> 'subject', ''),
      false, _resource.snapshot ->> 'summary', _resource.snapshot -> 'key_points', now()::text, now()::text);
    INSERT INTO public.group_shared_resource_imports(share_id, user_id, imported_resource_id)
    VALUES (_share_id, auth.uid(), _new_id);
    RETURN jsonb_build_object('type', 'note', 'id', _new_id, 'already_imported', FALSE);
  END IF;
  INSERT INTO public.flashcard_decks(id, user_id, name, subject, created_at)
  VALUES (_new_id, auth.uid(), coalesce(_resource.snapshot #>> '{deck,name}', _resource.title),
      coalesce(_resource.snapshot #>> '{deck,subject}', ''), now()::text);
  FOR _card IN SELECT value FROM jsonb_array_elements(coalesce(_resource.snapshot -> 'cards', '[]'::jsonb))
  LOOP
    INSERT INTO public.flashcards(id, user_id, deck_id, front, back, confidence)
    VALUES (gen_random_uuid()::text, auth.uid(), _new_id,
      coalesce(_card ->> 'front', ''), coalesce(_card ->> 'back', ''), 'unrated');
  END LOOP;
  INSERT INTO public.group_shared_resource_imports(share_id, user_id, imported_resource_id)
  VALUES (_share_id, auth.uid(), _new_id);
  RETURN jsonb_build_object('type', 'flashcard_deck', 'id', _new_id, 'already_imported', FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_group_shared_resource(_share_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.group_shared_resources SET revoked_at = now()
  WHERE id = _share_id AND owner_id = auth.uid() AND revoked_at IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_study_group(_group_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.study_groups WHERE id = _group_id AND owner_id = auth.uid();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_snapshot()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  RETURN jsonb_build_object(
    'groups', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', g.id, 'name', g.name, 'subject', g.subject, 'description', g.description,
        'created_at', g.created_at, 'my_role', mine.role
      ) ORDER BY g.created_at DESC)
      FROM public.study_group_members mine
      JOIN public.study_groups g ON g.id = mine.group_id
      WHERE mine.user_id = _uid
    ), '[]'::jsonb),
    'members', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'group_id', m.group_id, 'user_id', m.user_id, 'role', m.role,
        'display_name', coalesce(p.name, 'Student'), 'joined_at', m.joined_at
      ))
      FROM public.study_group_members m
      JOIN public.study_group_members mine ON mine.group_id = m.group_id AND mine.user_id = _uid
      LEFT JOIN public.profiles p ON p.user_id = m.user_id
    ), '[]'::jsonb),
    'sessions', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'group_id', s.group_id,
        'title', s.title, 'starts_at', s.starts_at, 'duration_minutes', s.duration_minutes,
        'created_at', s.created_at,
        'attendees', (SELECT coalesce(jsonb_agg(a.user_id), '[]'::jsonb)
          FROM public.group_study_session_attendees a WHERE a.session_id = s.id)
      ) ORDER BY s.starts_at)
      FROM public.group_study_sessions s
      JOIN public.study_group_members m ON m.group_id = s.group_id AND m.user_id = _uid
    ), '[]'::jsonb),
    'tutoring_profile', (SELECT to_jsonb(t) - 'user_id' FROM public.tutoring_profiles t WHERE t.user_id = _uid),
    'tutoring_requests', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'direction', CASE WHEN r.tutor_id = _uid THEN 'received' ELSE 'sent' END,
        'other_name', coalesce(p.name, 'Student'), 'message', r.message,
        'status', r.status, 'created_at', r.created_at
      ) ORDER BY r.created_at DESC)
      FROM public.tutoring_requests r
      JOIN public.profiles p ON p.user_id = CASE WHEN r.tutor_id = _uid THEN r.student_id ELSE r.tutor_id END
      WHERE r.tutor_id = _uid OR r.student_id = _uid
    ), '[]'::jsonb),
    'progress_shares', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'side', CASE WHEN s.owner_id = _uid THEN 'owner' ELSE 'recipient' END,
        'display_name', coalesce(p.name, 'Student'), 'scopes', s.scopes,
        'accepted_at', s.accepted_at, 'revoked_at', s.revoked_at
      ) ORDER BY s.accepted_at DESC)
      FROM public.progress_shares s
      JOIN public.profiles p ON p.user_id = CASE WHEN s.owner_id = _uid THEN s.recipient_id ELSE s.owner_id END
      WHERE s.owner_id = _uid OR s.recipient_id = _uid
    ), '[]'::jsonb),
    'progress_invitations', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'recipient_email', i.recipient_email, 'scopes', i.scopes,
        'expires_at', i.expires_at, 'revoked_at', i.revoked_at
      ) ORDER BY i.created_at DESC)
      FROM public.progress_share_invitations i WHERE i.owner_id = _uid
    ), '[]'::jsonb),
    'group_invitations', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'group_id', i.group_id, 'expires_at', i.expires_at,
        'revoked_at', i.revoked_at, 'created_at', i.created_at
      ) ORDER BY i.created_at DESC)
      FROM public.study_group_invitations i
      JOIN public.study_group_members m ON m.group_id = i.group_id AND m.user_id = _uid
      WHERE m.role IN ('owner', 'admin')
    ), '[]'::jsonb),
    'shared_resources', coalesce((
      SELECT jsonb_agg((to_jsonb(r) - 'owner_id') || jsonb_build_object(
        'owner_name', coalesce(p.name, 'Student'),
        'is_owner', r.owner_id = _uid
      ) ORDER BY r.created_at DESC)
      FROM public.group_shared_resources r
      JOIN public.study_group_members m ON m.group_id = r.group_id AND m.user_id = _uid
      LEFT JOIN public.profiles p ON p.user_id = r.owner_id
      WHERE r.revoked_at IS NULL OR r.owner_id = _uid
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_group_member_role(_group_id UUID, _member_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF _role NOT IN ('admin', 'member') THEN RAISE EXCEPTION 'Invalid member role'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE group_id = _group_id AND user_id = auth.uid() AND role = 'owner'
  ) THEN RAISE EXCEPTION 'Only the group owner can change administrator roles'; END IF;
  UPDATE public.study_group_members SET role = _role
  WHERE group_id = _group_id AND user_id = _member_id AND role <> 'owner';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.create_study_group(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_group_invitation(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_group_invitation(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_group_invitation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_study_group(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_group_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_group_study_session(UUID, TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_group_study_session(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_group_study_session(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.browse_tutors() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_tutoring_profile(TEXT, TEXT[], TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_tutoring(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_tutoring_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_tutoring_request(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_progress_share_invitation(TEXT, JSONB, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_progress_share_invitation(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_progress_share(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_progress_share_invitation(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_shared_progress(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.share_group_resource(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.edit_group_shared_resource(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.import_group_shared_resource(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_group_shared_resource(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_study_group(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_group_member_role(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.community_snapshot() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_study_group(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_invitation(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_group_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_group_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_study_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_group_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_study_session(UUID, TEXT, TIMESTAMPTZ, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_group_study_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_group_study_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.browse_tutors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_tutoring(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_tutoring_request(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_progress_share_invitation(TEXT, JSONB, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_progress_share_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_progress_share(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shared_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_group_resource(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_group_shared_resource(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_group_shared_resource(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_group_shared_resource(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_study_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_group_member_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_tutoring_profile(TEXT, TEXT[], TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_tutoring_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_progress_share_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_snapshot() TO authenticated;


-- -----------------------------------------------------------------------------
-- Source migration: 20261117140000_provider_integrations.sql
-- Apply only once to a fresh Supabase project.
-- -----------------------------------------------------------------------------

CREATE TABLE public.provider_integrations (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'google_classroom', 'canvas', 'moodle', 'google_calendar', 'outlook_calendar'
  )),
  encrypted_tokens JSONB NOT NULL CHECK (jsonb_typeof(encrypted_tokens) = 'object'),
  scopes TEXT[] NOT NULL DEFAULT '{}',
  instance_url TEXT,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(preferences) = 'object'),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error')),
  last_sync_error TEXT,
  PRIMARY KEY (user_id, provider)
);

CREATE TABLE public.provider_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'google_classroom', 'canvas', 'moodle', 'google_calendar', 'outlook_calendar'
  )),
  instance_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE public.calendar_event_sync (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'outlook_calendar')),
  source_id TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('task', 'exam', 'study_session')),
  remote_event_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider, source_id),
  UNIQUE (user_id, provider, remote_event_id)
);

ALTER TABLE public.provider_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_sync ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.provider_integrations, public.provider_oauth_states,
  public.calendar_event_sync FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.provider_integrations, public.provider_oauth_states,
  public.calendar_event_sync TO service_role;

CREATE INDEX provider_oauth_states_expiry_idx ON public.provider_oauth_states(expires_at);
CREATE INDEX calendar_event_sync_user_provider_idx
  ON public.calendar_event_sync(user_id, provider);


-- -----------------------------------------------------------------------------
-- Source migration: 20261120120000_student_toolkit.sql
-- Apply only once to a fresh Supabase project.
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- Source migration: 20261121150000_budget_profiles_schema_cache.sql
-- Apply only once to a fresh Supabase project.
-- -----------------------------------------------------------------------------

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




-- -----------------------------------------------------------------------------
-- Source migration: 20261122100000_peer_note_marketplace.sql
-- Apply after the prior migrations in a fresh Supabase project.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.study_coin_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance BETWEEN 0 AND 1000000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.study_market_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 80),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 20 AND 30000),
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, content_hash)
);

CREATE TABLE public.study_doubt_bounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 80),
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 10 AND 3000),
  reward INTEGER NOT NULL CHECK (reward BETWEEN 3 AND 100),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  accepted_answer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.study_bounty_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL REFERENCES public.study_doubt_bounties ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  answer TEXT NOT NULL CHECK (char_length(answer) BETWEEN 10 AND 3000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bounty_id, author_id)
);

ALTER TABLE public.study_doubt_bounties
  ADD CONSTRAINT study_doubt_bounties_accepted_answer_fk
  FOREIGN KEY (accepted_answer_id) REFERENCES public.study_bounty_answers ON DELETE SET NULL;

CREATE INDEX study_market_notes_created_idx ON public.study_market_notes(created_at DESC);
CREATE INDEX study_doubt_bounties_open_idx ON public.study_doubt_bounties(status, created_at DESC);
CREATE INDEX study_bounty_answers_bounty_idx ON public.study_bounty_answers(bounty_id, created_at);

ALTER TABLE public.study_coin_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_market_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_doubt_bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_bounty_answers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.study_coin_wallets, public.study_market_notes,
  public.study_doubt_bounties, public.study_bounty_answers
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.study_marketplace_snapshot()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _balance INTEGER;
  _notes JSONB;
  _bounties JSONB;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  INSERT INTO public.study_coin_wallets (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT balance INTO _balance FROM public.study_coin_wallets WHERE user_id = _user_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', n.id, 'title', n.title, 'subject', n.subject, 'content', n.content,
    'mine', n.owner_id = _user_id, 'created_at', n.created_at
  ) ORDER BY n.created_at DESC), '[]'::jsonb)
  INTO _notes FROM (
    SELECT * FROM public.study_market_notes ORDER BY created_at DESC LIMIT 100
  ) n;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id, 'subject', b.subject, 'question', b.question, 'reward', b.reward,
    'status', b.status, 'mine', b.owner_id = _user_id, 'created_at', b.created_at,
    'answers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'answer', a.answer, 'mine', a.author_id = _user_id,
        'accepted', a.id = b.accepted_answer_id, 'created_at', a.created_at
      ) ORDER BY a.created_at)
      FROM (
        SELECT * FROM public.study_bounty_answers
        WHERE bounty_id = b.id ORDER BY created_at LIMIT 20
      ) a
    ), '[]'::jsonb)
  ) ORDER BY b.created_at DESC), '[]'::jsonb)
  INTO _bounties FROM (
    SELECT * FROM public.study_doubt_bounties ORDER BY created_at DESC LIMIT 100
  ) b;

  RETURN jsonb_build_object('balance', _balance, 'notes', _notes, 'bounties', _bounties);
END;
$$;

CREATE OR REPLACE FUNCTION public.study_marketplace_action(_action TEXT, _payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _balance INTEGER;
  _bounty public.study_doubt_bounties%ROWTYPE;
  _answer public.study_bounty_answers%ROWTYPE;
  _new_id UUID;
  _reward INTEGER;
  _title TEXT;
  _subject TEXT;
  _content TEXT;
  _question TEXT;
  _answer_text TEXT;
  _hash TEXT;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  INSERT INTO public.study_coin_wallets (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF _action = 'share-note' THEN
    _title := btrim(_payload->>'title');
    _subject := btrim(_payload->>'subject');
    _content := btrim(_payload->>'content');
    IF char_length(_title) NOT BETWEEN 2 AND 120 OR
       char_length(_subject) NOT BETWEEN 1 AND 80 OR
       char_length(_content) NOT BETWEEN 20 AND 30000 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Check note title, subject, and content lengths.');
    END IF;
    _hash := encode(extensions.digest(_content, 'sha256'), 'hex');
    SELECT balance INTO _balance FROM public.study_coin_wallets WHERE user_id = _user_id FOR UPDATE;
    IF _balance > 999995 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Your study coin balance is at its limit.');
    END IF;
    IF (SELECT count(*) FROM public.study_market_notes
        WHERE owner_id = _user_id AND created_at > now() - interval '24 hours') >= 10 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Daily note-sharing limit reached. Try again tomorrow.');
    END IF;
    INSERT INTO public.study_market_notes(owner_id, title, subject, content, content_hash)
    VALUES (_user_id, _title, _subject, _content, _hash)
    ON CONFLICT (owner_id, content_hash) DO NOTHING
    RETURNING id INTO _new_id;
    IF _new_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This note has already been shared from your account.');
    END IF;
    UPDATE public.study_coin_wallets SET balance = balance + 5, updated_at = now()
    WHERE user_id = _user_id RETURNING balance INTO _balance;
    RETURN jsonb_build_object('ok', true, 'earned', 5, 'balance', _balance);
  ELSIF _action = 'post-bounty' THEN
    _subject := btrim(_payload->>'subject');
    _question := btrim(_payload->>'question');
    _reward := (_payload->>'reward')::INTEGER;
    IF char_length(_subject) NOT BETWEEN 1 AND 80 OR
       char_length(_question) NOT BETWEEN 10 AND 3000 OR _reward NOT BETWEEN 3 AND 100 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Check the subject, question, and 3–100 coin reward.');
    END IF;
    UPDATE public.study_coin_wallets SET balance = balance - _reward, updated_at = now()
    WHERE user_id = _user_id AND balance >= _reward RETURNING balance INTO _balance;
    IF _balance IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Not enough study coins for this bounty.');
    END IF;
    INSERT INTO public.study_doubt_bounties(owner_id, subject, question, reward)
    VALUES (_user_id, _subject, _question, _reward) RETURNING id INTO _new_id;
    RETURN jsonb_build_object('ok', true, 'bountyId', _new_id, 'balance', _balance);
  ELSIF _action = 'answer-bounty' THEN
    _new_id := (_payload->>'bountyId')::UUID;
    _answer_text := btrim(_payload->>'answer');
    SELECT * INTO _bounty FROM public.study_doubt_bounties WHERE id = _new_id FOR UPDATE;
    IF NOT FOUND OR _bounty.status <> 'open' OR _bounty.owner_id = _user_id OR
       char_length(_answer_text) NOT BETWEEN 10 AND 3000 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This bounty is closed or the answer is invalid.');
    END IF;
    INSERT INTO public.study_bounty_answers(bounty_id, author_id, answer)
    VALUES (_new_id, _user_id, _answer_text)
    ON CONFLICT (bounty_id, author_id) DO NOTHING
    RETURNING id INTO _new_id;
    IF _new_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'You have already answered this bounty.');
    END IF;
    RETURN jsonb_build_object('ok', true);
  ELSIF _action = 'accept-answer' THEN
    _new_id := (_payload->>'bountyId')::UUID;
    _hash := _payload->>'answerId';
    SELECT * INTO _bounty FROM public.study_doubt_bounties WHERE id = _new_id FOR UPDATE;
    SELECT * INTO _answer FROM public.study_bounty_answers WHERE id = _hash::UUID AND bounty_id = _new_id;
    IF NOT FOUND OR _bounty.owner_id <> _user_id OR _bounty.status <> 'open' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Only the bounty owner can accept an answer, and it can be awarded once.');
    END IF;
    UPDATE public.study_doubt_bounties SET status = 'answered', accepted_answer_id = _answer.id WHERE id = _bounty.id;
    UPDATE public.study_coin_wallets SET balance = balance + _bounty.reward, updated_at = now()
    WHERE user_id = _answer.author_id;
    SELECT balance INTO _balance FROM public.study_coin_wallets WHERE user_id = _user_id;
    RETURN jsonb_build_object('ok', true, 'awarded', _bounty.reward, 'balance', _balance);
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Unknown marketplace action.');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.study_marketplace_snapshot() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.study_marketplace_action(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.study_marketplace_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.study_marketplace_action(TEXT, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
