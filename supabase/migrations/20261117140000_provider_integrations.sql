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
