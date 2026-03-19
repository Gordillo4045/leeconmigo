create type if not exists public.request_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.tutor_student_requests (
  id                 uuid primary key default gen_random_uuid(),
  tutor_profile_id   uuid not null references public.profiles(id) on delete cascade,
  student_id         uuid not null references public.students(id) on delete cascade,
  student_curp       text not null,
  status             public.request_status not null default 'pending',
  reviewed_by        uuid null references public.profiles(id) on delete set null,
  reviewed_at        timestamptz null,
  rejection_reason   text null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Only one pending request per (tutor, student) at a time
create unique index if not exists tsr_unique_pending_idx
  on public.tutor_student_requests (tutor_profile_id, student_id)
  where status = 'pending';

create index if not exists tsr_tutor_profile_id_idx
  on public.tutor_student_requests (tutor_profile_id);

create index if not exists tsr_student_id_idx
  on public.tutor_student_requests (student_id);

-- updated_at trigger (reuse existing set_updated_at function)
create trigger trg_tutor_student_requests_updated_at
  before update on public.tutor_student_requests
  for each row execute function public.set_updated_at();

-- RLS
alter table public.tutor_student_requests enable row level security;

create policy tsr_tutor_read_own
  on public.tutor_student_requests for select to authenticated
  using (tutor_profile_id = auth.uid());
