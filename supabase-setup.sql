-- ============================================================
-- NECT EXAM — Full Database Setup
-- Paste this entire file into Supabase SQL Editor and Run
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TYPE exam_status AS ENUM ('draft', 'published', 'active', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.exams (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id         UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  instructions      TEXT,
  status            exam_status NOT NULL DEFAULT 'draft',
  is_public         BOOLEAN NOT NULL DEFAULT FALSE,
  duration_mins     INTEGER,
  pass_score        INTEGER DEFAULT 60,
  shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
  show_results      BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('mcq', 'true_false', 'short_answer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.questions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id     UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  type        question_type NOT NULL,
  prompt      TEXT NOT NULL,
  points      INTEGER NOT NULL DEFAULT 1,
  position    INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.answer_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.question_library (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type question_type NOT NULL,
  prompt text NOT NULL,
  points integer NOT NULL DEFAULT 1,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.question_library_options (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_library_id uuid NOT NULL REFERENCES public.question_library(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT FALSE,
  position integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.exam_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id     UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

DO $$ BEGIN
  CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'graded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.attempts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id         UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          attempt_status NOT NULL DEFAULT 'in_progress',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ,
  time_spent_secs INTEGER,
  score_raw       INTEGER,
  score_pct       NUMERIC(5,2),
  passed          BOOLEAN,
  graded_at       TIMESTAMPTZ,
  grader_notes    TEXT,
  UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.responses (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id         UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id        UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.answer_options(id),
  text_answer        TEXT,
  is_correct         BOOLEAN,
  points_awarded     INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- 3. FUNCTIONS & TRIGGERS

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at  BEFORE UPDATE ON public.profiles  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_courses_updated_at   BEFORE UPDATE ON public.courses   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_exams_updated_at     BEFORE UPDATE ON public.exams     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION expire_past_exams()
RETURNS void AS $$
BEGIN
  UPDATE public.exams SET status = 'expired'
  WHERE status IN ('published', 'active') AND ends_at IS NOT NULL AND ends_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION grade_attempt(p_attempt_id UUID)
RETURNS void AS $$
DECLARE
  v_total_points  INTEGER;
  v_earned_points INTEGER;
  v_pass_score    INTEGER;
  v_exam_id       UUID;
BEGIN
  SELECT exam_id INTO v_exam_id FROM public.attempts WHERE id = p_attempt_id;

  UPDATE public.responses r
  SET is_correct = (ao.is_correct = TRUE),
      points_awarded = CASE WHEN ao.is_correct THEN q.points ELSE 0 END
  FROM public.questions q
  JOIN public.answer_options ao ON ao.id = r.selected_option_id
  WHERE r.attempt_id = p_attempt_id AND r.selected_option_id IS NOT NULL
    AND q.id = r.question_id AND q.type IN ('mcq', 'true_false');

  UPDATE public.responses r SET points_awarded = 0
  FROM public.questions q
  WHERE r.attempt_id = p_attempt_id AND q.id = r.question_id
    AND q.type = 'short_answer' AND r.points_awarded IS NULL;

  SELECT COALESCE(SUM(q.points), 0), COALESCE(SUM(r.points_awarded), 0)
  INTO v_total_points, v_earned_points
  FROM public.questions q
  LEFT JOIN public.responses r ON r.question_id = q.id AND r.attempt_id = p_attempt_id
  WHERE q.exam_id = v_exam_id;

  SELECT pass_score INTO v_pass_score FROM public.exams WHERE id = v_exam_id;

  UPDATE public.attempts
  SET score_raw  = v_earned_points,
      score_pct  = CASE WHEN v_total_points > 0 THEN ROUND((v_earned_points::NUMERIC / v_total_points) * 100, 2) ELSE 0 END,
      passed     = (CASE WHEN v_total_points > 0 THEN ROUND((v_earned_points::NUMERIC / v_total_points) * 100, 2) ELSE 0 END) >= COALESCE(v_pass_score, 60),
      status     = 'graded',
      graded_at  = NOW()
  WHERE id = p_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. ROW LEVEL SECURITY

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_options   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses        ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY "profiles_read_own"   ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_read_admin" ON public.profiles FOR SELECT USING (public.current_user_role() = 'admin');
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "courses_admin_all"    ON public.courses FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY "courses_student_read" ON public.courses FOR SELECT USING (
  public.current_user_role() = 'student' AND EXISTS (
    SELECT 1 FROM public.exams e LEFT JOIN public.exam_assignments ea ON ea.exam_id = e.id
    WHERE e.course_id = courses.id AND e.status IN ('published','active')
      AND (e.is_public = TRUE OR ea.student_id = auth.uid())
  )
);

CREATE POLICY "exams_admin_all"    ON public.exams FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY "exams_student_read" ON public.exams FOR SELECT USING (
  public.current_user_role() = 'student' AND status IN ('published','active') AND (
    is_public = TRUE OR EXISTS (
      SELECT 1 FROM public.exam_assignments ea WHERE ea.exam_id = exams.id AND ea.student_id = auth.uid()
    )
  )
);

CREATE POLICY "questions_admin_all"    ON public.questions FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY "questions_student_read" ON public.questions FOR SELECT USING (
  public.current_user_role() = 'student' AND EXISTS (
    SELECT 1 FROM public.exams e LEFT JOIN public.exam_assignments ea ON ea.exam_id = e.id
    WHERE e.id = questions.exam_id AND e.status IN ('published','active')
      AND (e.is_public = TRUE OR ea.student_id = auth.uid())
  )
);

CREATE POLICY "options_admin_all"    ON public.answer_options FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY "options_student_read" ON public.answer_options FOR SELECT USING (
  public.current_user_role() = 'student' AND EXISTS (
    SELECT 1 FROM public.questions q JOIN public.exams e ON e.id = q.exam_id
    LEFT JOIN public.exam_assignments ea ON ea.exam_id = e.idad
    WHERE q.id = answer_options.question_id AND e.status IN ('published','active')
      AND (e.is_public = TRUE OR ea.student_id = auth.uid())
  )
);

CREATE POLICY "assignments_admin_all"    ON public.exam_assignments FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY "assignments_student_read" ON public.exam_assignments FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "attempts_admin_read"     ON public.attempts FOR SELECT USING (public.current_user_role() = 'admin');
CREATE POLICY "attempts_student_read"   ON public.attempts FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "attempts_student_insert" ON public.attempts FOR INSERT WITH CHECK (student_id = auth.uid() AND public.current_user_role() = 'student');
CREATE POLICY "attempts_student_update" ON public.attempts FOR UPDATE USING (student_id = auth.uid() AND status = 'in_progress');

CREATE POLICY "responses_admin_read"     ON public.responses FOR SELECT USING (public.current_user_role() = 'admin');
CREATE POLICY "responses_student_read"   ON public.responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.attempts a WHERE a.id = responses.attempt_id AND a.student_id = auth.uid())
);
CREATE POLICY "responses_student_insert" ON public.responses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.attempts a WHERE a.id = responses.attempt_id AND a.student_id = auth.uid() AND a.status = 'in_progress')
);
CREATE POLICY "responses_student_update" ON public.responses FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.attempts a WHERE a.id = responses.attempt_id AND a.student_id = auth.uid() AND a.status = 'in_progress')
);

-- 5. DEFAULT USERS

-- Admin (email: admin@nect.com / password: admin1234)

DO $$
DECLARE v_uid UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@nect.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_user_meta_data, raw_app_meta_data,
      created_at, updated_at, role, aud, is_sso_user
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'admin@nect.com',
      crypt('admin1234', gen_salt('bf')),
      now(), now(),
      '{"full_name": "Admin", "role": "admin"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      now(), now(), 'authenticated', 'authenticated', false
    ) RETURNING id INTO v_uid;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_uid, 'admin@nect.com', 'Admin', 'admin')
    ON CONFLICT (id) DO NOTHING;

  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('admin1234', gen_salt('bf')),
        email_confirmed_at = now(),
        raw_user_meta_data = '{"full_name": "Admin", "role": "admin"}'::jsonb
    WHERE email = 'admin@nect.com'
    RETURNING id INTO v_uid;

    INSERT INTO public.profiles (id, email, full_name, role)
    SELECT v_uid, 'admin@nect.com', 'Admin', 'admin'
    WHERE v_uid IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Admin';
  END IF;
END $$;

-- Dummy Student (email: student@nect.com / password: student1234)

DO $$
DECLARE v_uid UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student@nect.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_user_meta_data, raw_app_meta_data,
      created_at, updated_at, role, aud, is_sso_user
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'student@nect.com',
      crypt('student1234', gen_salt('bf')),
      now(), now(),
      '{"full_name": "Test Student", "role": "student"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      now(), now(), 'authenticated', 'authenticated', false
    ) RETURNING id INTO v_uid;

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_uid, 'student@nect.com', 'Test Student', 'student')
    ON CONFLICT (id) DO NOTHING;

  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('student1234', gen_salt('bf')),
        email_confirmed_at = now(),
        raw_user_meta_data = '{"full_name": "Test Student", "role": "student"}'::jsonb
    WHERE email = 'student@nect.com'
    RETURNING id INTO v_uid;

    INSERT INTO public.profiles (id, email, full_name, role)
    SELECT v_uid, 'student@nect.com', 'Test Student', 'student'
    WHERE v_uid IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET role = 'student', full_name = 'Test Student';
  END IF;
END $$;
