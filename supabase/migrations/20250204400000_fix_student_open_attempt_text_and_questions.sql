-- Cargar texto de la sesión aunque esté soft-deleted (evaluación ya publicada).
-- Asegurar content y questions nunca null para que el cliente no muestre "código no válido".

create or replace function public.student_open_attempt(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code_hash bytea;
  v_attempt_id uuid;
  v_session_id uuid;
  v_expires_at timestamptz;
  v_text_id uuid;
  v_quiz_id uuid;
  v_title text;
  v_content text;
  v_topic text;
  v_grade smallint;
  v_difficulty text;
  v_questions jsonb;
begin
  if p_code is null or length(trim(p_code)) < 4 then
    raise exception 'Invalid code';
  end if;

  v_code_hash := decode(md5(upper(trim(p_code))), 'hex');

  select a.id, a.session_id, s.expires_at, s.text_id, s.quiz_id
    into v_attempt_id, v_session_id, v_expires_at, v_text_id, v_quiz_id
  from public.attempt_access_codes ac
  join public.evaluation_attempts a on a.id = ac.attempt_id
  join public.evaluation_sessions s on s.id = a.session_id
  where ac.code_hash = v_code_hash
    and ac.revoked_at is null
    and s.deleted_at is null
    and a.deleted_at is null
  order by ac.expires_at desc, ac.created_at desc
  limit 1;

  if v_attempt_id is null then
    raise exception 'Code not found';
  end if;

  if v_expires_at <= now() then
    raise exception 'Code expired';
  end if;

  -- Texto: no filtrar por deleted_at para no ocultar evaluaciones ya publicadas
  select t.title, t.content, t.topic, t.grade_id, t.difficulty
    into v_title, v_content, v_topic, v_grade, v_difficulty
  from public.texts t
  where t.id = v_text_id;

  if v_content is null and v_text_id is not null then
    raise exception 'Text not found for this session';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', qq.id,
        'q', qq.prompt,
        'options', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'option_id', qo.id,
                'text', qo.option_text
              )
              order by qo.order_index
            ),
            '[]'::jsonb
          )
          from public.quiz_options qo
          where qo.question_id = qq.id
        )
      )
      order by qq.order_index
    ),
    '[]'::jsonb
  )
  into v_questions
  from public.quiz_questions qq
  where qq.quiz_id = v_quiz_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'session_id', v_session_id,
    'expires_at', v_expires_at,
    'text', jsonb_build_object(
      'title', coalesce(v_title, ''),
      'topic', coalesce(v_topic, ''),
      'grade', coalesce(v_grade, 0),
      'difficulty', coalesce(v_difficulty, ''),
      'content', coalesce(v_content, '')
    ),
    'questions', coalesce(v_questions, '[]'::jsonb)
  );
end;
$$;
