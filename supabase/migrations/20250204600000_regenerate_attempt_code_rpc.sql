-- Regenerar código de acceso: revoca el actual e inserta uno nuevo.
-- Solo para uso desde el backend (maestro); no exponer a anon.

create or replace function public.regenerate_attempt_code(
  p_attempt_id uuid,
  p_new_code_plain text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires_at timestamptz;
  v_code_hash bytea;
  v_code_hex text;
begin
  if p_new_code_plain is null or length(trim(p_new_code_plain)) < 4 then
    raise exception 'Invalid code';
  end if;

  select expires_at into v_expires_at
  from public.attempt_access_codes
  where attempt_id = p_attempt_id and revoked_at is null
  order by created_at desc limit 1;

  if v_expires_at is null then
    select s.expires_at into v_expires_at
    from public.evaluation_attempts a
    join public.evaluation_sessions s on s.id = a.session_id
    where a.id = p_attempt_id;
    if v_expires_at is null then
      v_expires_at := now() + interval '1 hour';
    end if;
  end if;

  update public.attempt_access_codes
  set revoked_at = now()
  where attempt_id = p_attempt_id;

  v_code_hash := decode(md5(upper(trim(p_new_code_plain))), 'hex');
  v_code_hex := encode(v_code_hash, 'hex');

  insert into public.attempt_access_codes (attempt_id, code_hash, code_hex, expires_at)
  values (p_attempt_id, v_code_hash, v_code_hex, v_expires_at);

  return jsonb_build_object('code', upper(trim(p_new_code_plain)), 'expires_at', v_expires_at);
end;
$$;
