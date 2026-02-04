-- ============================================================
-- Rellenar profiles para usuarios que ya existían en auth.users
-- (cuentas creadas antes del trigger). Ejecutar una sola vez.
--
-- No inserta si ya hay perfil con ese id ni si ya existe el email
-- (ej. master creado a mano con ese correo).
-- Si usas schema "app", cambia public.profiles por app.profiles.
-- ============================================================

insert into public.profiles (id, role, email, full_name)
select
  u.id,
  'tutor',
  u.email,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    ''
  )
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
  and not exists (select 1 from public.profiles p where p.email = u.email);
