-- ==============================================================================
-- ProTaskerGeek Database Incremental Migration Script
-- File: update_Database_schem.sql
-- Description: Idempotent database update script to apply new tables, columns,
--              types, indexes, and RLS policies for:
--              1. Dual Rating System (Quality Rating & Completion Rate)
--              2. Project-Based Workspaces & Hourly Tracking
--              3. Grammar Assessment & Skill Upgrades (Universal Tier)
--              4. Discipline Assessments (10 MCQs + 10 Long-Form Essays)
-- ==============================================================================

-- 1. Ensure Extensions & Schema Exist
CREATE SCHEMA IF NOT EXISTS public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Update Custom Types and Enums (Idempotent)
DO $$ BEGIN
    -- Add 'universal' tier to skill_upgrade_tier_type if not present
    ALTER TYPE public.skill_upgrade_tier_type ADD VALUE IF NOT EXISTS 'universal';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN
        -- If type didn't exist, create it with all current tiers
        CREATE TYPE public.skill_upgrade_tier_type AS ENUM ('member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'premium', 'universal');
END $$;

DO $$ BEGIN
    -- Add payment method types if needed
    ALTER TYPE public.payment_method_type ADD VALUE IF NOT EXISTS 'manual';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    -- Add task status types if needed
    ALTER TYPE public.task_status_type ADD VALUE IF NOT EXISTS 'cancelled';
    ALTER TYPE public.task_status_type ADD VALUE IF NOT EXISTS 'submitted';
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

-- 3. Update Existing Tables with New Columns (Safe IF NOT EXISTS)

-- A. Users Table: Add Dual Rating, Project Access, and Grammar Assessment fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS task_preference text DEFAULT 'all';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_project_access boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS quality_rating numeric DEFAULT 5.0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS completion_rate numeric DEFAULT 100;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS grammar_test_attempts integer DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS grammar_test_passed boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS grammar_test_score numeric DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS orientation_complete boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pending_verification boolean DEFAULT false;

-- Backfill users default rating values if null
UPDATE public.users SET quality_rating = 5.0 WHERE quality_rating IS NULL;
UPDATE public.users SET completion_rate = 100 WHERE completion_rate IS NULL;
UPDATE public.users SET task_preference = 'all' WHERE task_preference IS NULL;
UPDATE public.users SET has_project_access = false WHERE has_project_access IS NULL;
UPDATE public.users SET grammar_test_attempts = 0 WHERE grammar_test_attempts IS NULL;
UPDATE public.users SET grammar_test_passed = false WHERE grammar_test_passed IS NULL;

-- B. User Stats Table: Add Quality Rating, Completion Rate, and Cancellation/Rejection counters
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS quality_rating numeric DEFAULT 5.0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS completion_rate numeric DEFAULT 100;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS tasks_cancelled integer DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS tasks_rejected integer DEFAULT 0;

-- Backfill user_stats default values if null
UPDATE public.user_stats SET quality_rating = 5.0 WHERE quality_rating IS NULL;
UPDATE public.user_stats SET completion_rate = 100 WHERE completion_rate IS NULL;
UPDATE public.user_stats SET tasks_cancelled = 0 WHERE tasks_cancelled IS NULL;
UPDATE public.user_stats SET tasks_rejected = 0 WHERE tasks_rejected IS NULL;

-- C. Tasks Table: Add Project-Based Task support, hourly rate, participant limits, and structures
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'standard';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS max_participants integer DEFAULT 1;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS current_participants integer DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer DEFAULT 30;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS required_skills jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_structure jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS instructions text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_orientation boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_recommended boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Backfill tasks defaults if null
UPDATE public.tasks SET task_type = 'standard' WHERE task_type IS NULL;
UPDATE public.tasks SET hourly_rate = 0 WHERE hourly_rate IS NULL;
UPDATE public.tasks SET max_participants = 1 WHERE max_participants IS NULL;
UPDATE public.tasks SET current_participants = 0 WHERE current_participants IS NULL;
UPDATE public.tasks SET estimated_duration_minutes = 30 WHERE estimated_duration_minutes IS NULL;
UPDATE public.tasks SET required_skills = '[]'::jsonb WHERE required_skills IS NULL;
UPDATE public.tasks SET project_structure = '[]'::jsonb WHERE project_structure IS NULL;

-- D. User Tasks Table: Add Quality Rating feedback, time tracking, accrued earnings, and responses
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS quality_rating numeric;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS time_spent_seconds integer DEFAULT 0;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS accrued_earnings numeric DEFAULT 0;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS project_responses jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS submission_description text;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS proof_attachments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS feedback_attachments jsonb DEFAULT '[]'::jsonb;

-- Backfill user_tasks defaults if null
UPDATE public.user_tasks SET time_spent_seconds = 0 WHERE time_spent_seconds IS NULL;
UPDATE public.user_tasks SET hourly_rate = 0 WHERE hourly_rate IS NULL;
UPDATE public.user_tasks SET accrued_earnings = 0 WHERE accrued_earnings IS NULL;
UPDATE public.user_tasks SET project_responses = '{}'::jsonb WHERE project_responses IS NULL;

-- 4. Create New Tables

-- A. Assessment Submissions Table
-- Handles Grammar Tests, Hourly Qualification, and Discipline Assessments (MCQs + Essays)
CREATE TABLE IF NOT EXISTS public.assessment_submissions (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    assessment_type text NOT NULL, -- 'grammar', 'discipline', 'hourly'
    discipline_id text,
    mcq_answers jsonb,
    written_answers jsonb,
    score numeric DEFAULT 0,
    total_questions integer DEFAULT 0,
    passed boolean DEFAULT false,
    attempt_number integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

-- B. Manual Subscriptions Table (for offline/manual skill upgrades)
CREATE TABLE IF NOT EXISTS public.manual_subscriptions (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT DEFAULT 'manual',
    payment_reference TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C. Task Recommendations Table
CREATE TABLE IF NOT EXISTS public.task_recommendations (
    id serial PRIMARY KEY,
    sender_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    task_id integer REFERENCES public.tasks(id) ON DELETE CASCADE,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- D. Friends Table
CREATE TABLE IF NOT EXISTS public.friends (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    friend_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    status text CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_user_id ON public.assessment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_type ON public.assessment_submissions(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_discipline ON public.assessment_submissions(discipline_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_created_at ON public.assessment_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_grammar_test ON public.users(grammar_test_passed, grammar_test_attempts);
CREATE INDEX IF NOT EXISTS idx_users_project_access ON public.users(has_project_access, task_preference);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks(task_type, is_active);
CREATE INDEX IF NOT EXISTS idx_user_tasks_quality_rating ON public.user_tasks(quality_rating);
CREATE INDEX IF NOT EXISTS idx_manual_subscriptions_user_id ON public.manual_subscriptions(user_id);

-- 6. Helper Functions (Non-recursive Admin Check)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Row-Level Security (RLS) Configuration
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_recommendations ENABLE ROW LEVEL SECURITY;

-- Service Role Full Access
DROP POLICY IF EXISTS "Service Role Full Access Assessment Submissions" ON public.assessment_submissions;
CREATE POLICY "Service Role Full Access Assessment Submissions" ON public.assessment_submissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Full Access Manual Subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Service Role Full Access Manual Subscriptions" ON public.manual_subscriptions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Assessment Submissions Policies
DROP POLICY IF EXISTS "Users can view own assessment submissions" ON public.assessment_submissions;
CREATE POLICY "Users can view own assessment submissions" ON public.assessment_submissions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own assessment submissions" ON public.assessment_submissions;
CREATE POLICY "Users can insert own assessment submissions" ON public.assessment_submissions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all assessment submissions" ON public.assessment_submissions;
CREATE POLICY "Admins can view all assessment submissions" ON public.assessment_submissions
    FOR SELECT TO authenticated USING (public.is_admin());

-- Manual Subscriptions Policies
DROP POLICY IF EXISTS "Users can view own manual subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Users can view own manual subscriptions" ON public.manual_subscriptions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own manual subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Users can insert own manual subscriptions" ON public.manual_subscriptions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all manual subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Admins can view all manual subscriptions" ON public.manual_subscriptions
    FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update manual subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Admins can update manual subscriptions" ON public.manual_subscriptions
    FOR UPDATE TO authenticated USING (public.is_admin());

-- 8. Storage Buckets (Task Attachments & Proof Submissions)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-submissions', 'proof-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Admins have full access to task-attachments" ON storage.objects;
CREATE POLICY "Admins have full access to task-attachments"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'task-attachments' AND
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  bucket_id = 'task-attachments' AND
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

DROP POLICY IF EXISTS "Authenticated users can read task-attachments" ON storage.objects;
CREATE POLICY "Authenticated users can read task-attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Allow authenticated uploads to proof-submissions" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to proof-submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proof-submissions');

DROP POLICY IF EXISTS "Admins can view all proof-submissions" ON storage.objects;
CREATE POLICY "Admins can view all proof-submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proof-submissions' AND
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- 9. Updated Auth Trigger with All Fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_referral_code text;
BEGIN
  new_referral_code := lower(substring(NEW.email from 1 for 4)) || floor(random() * 10000)::text;

  INSERT INTO public.users (
    id,
    name,
    email,
    phone,
    gender,
    country,
    role,
    approval_status,
    verification_status,
    orientation_complete,
    grammar_test_attempts,
    grammar_test_passed,
    skill_upgrade_tier,
    referral_code,
    referred_by,
    is_active,
    task_preference,
    has_project_access,
    quality_rating,
    completion_rate,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    (NEW.raw_user_meta_data->>'gender')::public.gender_type,
    NEW.raw_user_meta_data->>'country',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.role_type, 'user'),
    'pending',
    'unverified',
    false,
    0,
    false,
    'member',
    new_referral_code,
    NEW.raw_user_meta_data->>'referred_by',
    true,
    COALESCE(NEW.raw_user_meta_data->>'task_preference', 'all'),
    false,
    5.0,
    100,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create User Stats with Dual Ratings
  INSERT INTO public.user_stats (
    user_id,
    tasks_completed,
    tasks_approved,
    tasks_rejected,
    tasks_cancelled,
    rating,
    completion_rate,
    quality_rating,
    updated_at
  )
  VALUES (
    NEW.id,
    0,
    0,
    0,
    0,
    100,
    100,
    5.0,
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create Wallet
  INSERT INTO public.wallets (user_id, available_balance, pending_balance, total_earnings, total_withdrawn, updated_at)
  VALUES (NEW.id, 0, 0, 0, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reattach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Schema Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.assessment_submissions TO authenticated;
GRANT SELECT, INSERT ON public.manual_subscriptions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
