-- Add child info columns to profiles (for tutor onboarding)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS child_name  text,
  ADD COLUMN IF NOT EXISTS child_grade smallint;

-- Table to link tutors to students (N:M)
CREATE TABLE IF NOT EXISTS public.student_tutors (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id       uuid NOT NULL REFERENCES public.students(id),
  tutor_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  assigned_by      uuid NOT NULL REFERENCES public.profiles(id),
  created_at       timestamptz DEFAULT now(),
  deleted_at       timestamptz,
  UNIQUE (student_id, tutor_profile_id)
);
