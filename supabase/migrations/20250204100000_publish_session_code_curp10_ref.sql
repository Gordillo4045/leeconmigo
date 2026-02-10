-- Código por alumno: primeros 10 del CURP + guión + código de referencia de la evaluación (6 caracteres).
-- Se sigue guardando solo el hash (MD5) para compatibilidad con student_open_attempt.

create or replace function public.publish_evaluation_session(
  p_classroom_id uuid,
  p_text_id uuid,
  p_quiz_id uuid,
  p_expires_in_minutes integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_role text;
  v_institution uuid;
  v_grade_id smallint;
  v_qcount int;
  v_session_id uuid;
  v_attempt_id uuid;
  v_student_id uuid;
  v_curp text;
  v_session_ref text;
  v_code text;
  v_code_hash bytea;
  v_expires_at timestamptz;
  v_codes jsonb := '[]'::jsonb;
begin
  v_actor := auth.uid();
  if v_actor is null then raise exception 'Not authenticated'; end if;

  select p.role::text, p.institution_id into v_role, v_institution
  from public.profiles p where p.id = v_actor and p.deleted_at is null;
  if v_role is null then raise exception 'Profile not found'; end if;
  if v_role not in ('maestro','admin','master') then raise exception 'Unauthorized role: %', v_role; end if;
  if v_institution is null then raise exception 'Institution missing on profile'; end if;

  if not exists (select 1 from public.classrooms c where c.id = p_classroom_id and c.institution_id = v_institution and c.deleted_at is null) then
    raise exception 'Classroom not found in your institution';
  end if;
  if v_role = 'maestro' and not public.teacher_has_classroom(p_classroom_id) then
    raise exception 'Teacher is not assigned to this classroom';
  end if;

  select t.grade_id into v_grade_id from public.texts t where t.id = p_text_id and t.institution_id = v_institution and t.deleted_at is null;
  if v_grade_id is null then raise exception 'Text not found in your institution'; end if;

  select q.question_count into v_qcount from public.quizzes q where q.id = p_quiz_id and q.text_id = p_text_id and q.institution_id = v_institution and q.deleted_at is null;
  if v_qcount is null then raise exception 'Quiz not found / does not belong to text'; end if;
  if v_qcount < 3 or v_qcount > 8 then raise exception 'Quiz question_count must be 3..8, got %', v_qcount; end if;

  insert into public.evaluation_sessions (institution_id, classroom_id, teacher_profile_id, text_id, quiz_id, status, published_at, expires_at, created_by, updated_by)
  values (v_institution, p_classroom_id, v_actor, p_text_id, p_quiz_id, 'open'::public.session_status, now(),
    now() + make_interval(mins => greatest(1, least(240, p_expires_in_minutes))), v_actor, v_actor)
  returning id, expires_at into v_session_id, v_expires_at;

  v_session_ref := upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));

  for v_student_id, v_curp in
    select se.student_id, s.curp
    from public.student_enrollments se
    join public.students s on s.id = se.student_id and s.deleted_at is null
    where se.classroom_id = p_classroom_id and se.active = true and se.deleted_at is null
  loop
    insert into public.evaluation_attempts (session_id, student_id, status, total_questions, created_by, updated_by)
    values (v_session_id, v_student_id, 'pending'::public.attempt_status, v_qcount, v_actor, v_actor)
    returning id into v_attempt_id;

    v_code := upper(left(trim(v_curp), 10)) || '-' || v_session_ref;
    v_code_hash := decode(md5(v_code), 'hex');

    insert into public.attempt_access_codes (attempt_id, code_hash, expires_at, created_by)
    values (v_attempt_id, v_code_hash, v_expires_at, v_actor);

    v_codes := v_codes || jsonb_build_array(jsonb_build_object('student_id', v_student_id, 'attempt_id', v_attempt_id, 'code', v_code));
  end loop;

  return jsonb_build_object('session_id', v_session_id, 'classroom_id', p_classroom_id, 'text_id', p_text_id, 'quiz_id', p_quiz_id,
    'question_count', v_qcount, 'expires_in_minutes', greatest(1, least(240, p_expires_in_minutes)), 'codes', v_codes);
end;
$$;
