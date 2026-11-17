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
