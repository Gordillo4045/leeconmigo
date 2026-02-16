-- Fix teacher_has_classroom: classroom_teachers no tiene deleted_at
-- Asegurar que la función no intente usar ct.deleted_at

create or replace function public.teacher_has_classroom(_classroom_id uuid)
returns boolean 
language sql 
stable
as $$
  select exists(
    select 1
    from public.classroom_teachers ct
    where ct.classroom_id = _classroom_id
      and ct.teacher_profile_id = auth.uid()
  )
$$;
