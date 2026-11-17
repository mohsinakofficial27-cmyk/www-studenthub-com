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
