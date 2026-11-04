-- Quiz attempt scores must be decided by the server. Signed-in users lose
-- direct INSERT/UPDATE on quiz_attempts; attempts are written only through the
-- security-definer function below, which grades the submitted answers against
-- the stored quiz questions.

REVOKE INSERT, UPDATE ON public.quiz_attempts FROM authenticated;

CREATE OR REPLACE FUNCTION public.record_quiz_attempt(_quiz_id text, _answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user uuid := auth.uid();
  v_questions jsonb;
  v_total integer;
  v_score integer := 0;
  v_clean jsonb := '[]'::jsonb;
  v_pick integer;
  v_correct integer;
  v_options integer;
  v_i integer;
  v_attempt_id text;
  v_taken_at text;
  v_row jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Not authenticated';
  END IF;

  IF _quiz_id IS NULL OR btrim(_quiz_id) = '' OR length(_quiz_id) > 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid quiz id';
  END IF;

  SELECT questions INTO v_questions
    FROM public.quizzes WHERE id = _quiz_id AND user_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Quiz not found';
  END IF;

  IF v_questions IS NULL OR jsonb_typeof(v_questions) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'Quiz has no questions';
  END IF;
  v_total := jsonb_array_length(v_questions);
  IF v_total = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22000', MESSAGE = 'Quiz has no questions';
  END IF;

  IF _answers IS NULL OR jsonb_typeof(_answers) <> 'array'
     OR jsonb_array_length(_answers) <> v_total THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Answers must match the number of questions';
  END IF;

  FOR v_i IN 0 .. v_total - 1 LOOP
    BEGIN
      v_pick := (_answers ->> v_i)::integer;
    EXCEPTION WHEN OTHERS THEN
      v_pick := -1;
    END;
    v_options := jsonb_array_length(COALESCE(v_questions -> v_i -> 'options', '[]'::jsonb));
    v_correct := -1;
    IF v_options > 0 AND v_pick >= 0 AND v_pick < v_options THEN
      BEGIN
        v_correct := (v_questions -> v_i ->> 'answer')::integer;
      EXCEPTION WHEN OTHERS THEN
        v_correct := -1;
      END;
      IF v_pick = v_correct THEN
        v_score := v_score + 1;
      END IF;
    ELSE
      v_pick := -1;
    END IF;
    v_clean := v_clean || to_jsonb(v_pick);
  END LOOP;

  v_attempt_id := gen_random_uuid()::text;
  v_taken_at := to_char(clock_timestamp() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  INSERT INTO public.quiz_attempts (id, user_id, quiz_id, score, total, answers, taken_at)
  VALUES (v_attempt_id, v_user, _quiz_id, v_score, v_total, v_clean, v_taken_at);

  SELECT to_jsonb(a) INTO v_row FROM public.quiz_attempts a WHERE a.id = v_attempt_id;
  RETURN v_row;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.record_quiz_attempt(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_quiz_attempt(text, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.record_quiz_attempt(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.record_quiz_attempt(text, jsonb) FROM public;
