-- ============================================================
-- Perfil automático al registrarse (rol tutor por defecto)
-- Ejecutar en Supabase SQL Editor o con: supabase db push
--
-- Si tus tablas están en schema "app" en lugar de "public",
-- cambia "public.profiles" por "app.profiles" abajo.
-- ============================================================

-- Función que crea/actualiza el perfil al insertar en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Nuevo usuario: insertar con rol tutor. Si ya existe (ej. master), solo actualizar email/full_name
  insert into public.profiles (id, role, email, full_name)
  values (
    new.id,
    'tutor',
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    )
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, profiles.email),
    full_name = coalesce(nullif(trim(excluded.full_name), ''), profiles.full_name),
    updated_at = now();

  return new;
end;
$$;

-- Trigger: después de cada INSERT en auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
