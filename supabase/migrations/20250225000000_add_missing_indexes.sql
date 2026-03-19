CREATE INDEX IF NOT EXISTS idx_student_tutors_tutor_profile_id ON public.student_tutors(tutor_profile_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_sessions_teacher_profile_id ON public.evaluation_sessions(teacher_profile_id, published_at DESC);
