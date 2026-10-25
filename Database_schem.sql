-- ==============================================================================
-- ProTaskerGeek Unified Production Database Schema
-- File: Database_schem.sql
-- Description: Complete, consolidated, production-ready schema for Supabase.
--              Run this script directly in the Supabase SQL Editor for new deployments.
-- ==============================================================================

-- 1. Ensure extensions and schema exist
CREATE SCHEMA IF NOT EXISTS public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Types & Enums
DO $$ BEGIN
    CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'geek');
    CREATE TYPE public.role_type AS ENUM ('user', 'admin');
    CREATE TYPE public.approval_status_type AS ENUM ('pending', 'approved', 'rejected');
    CREATE TYPE public.skill_upgrade_tier_type AS ENUM ('member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'premium', 'universal');
    CREATE TYPE public.task_category_type AS ENUM ('main', 'social', 'surveys', 'testing', 'ai', 'app');
    CREATE TYPE public.task_status_type AS ENUM ('pending', 'approved', 'rejected', 'claimed', 'revision_requested', 'cancelled', 'submitted');
    CREATE TYPE public.transaction_type AS ENUM ('earning', 'withdrawal', 'referral', 'skill-upgrade');
    CREATE TYPE public.transaction_status_type AS ENUM ('pending', 'completed', 'failed');
    CREATE TYPE public.order_status_type AS ENUM ('pending', 'completed', 'failed', 'refunded');
    CREATE TYPE public.payment_method_type AS ENUM ('paypal', 'manual');
    CREATE TYPE public.skill_upgrade_status_type AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Core Tables

-- A. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    gender public.gender_type,
    country text,
    role public.role_type DEFAULT 'user',
    approval_status public.approval_status_type DEFAULT 'pending',
    verification_status text DEFAULT 'unverified',
    orientation_complete boolean DEFAULT false,
    grammar_test_attempts integer DEFAULT 0,
    grammar_test_passed boolean DEFAULT false,
    grammar_test_score numeric DEFAULT NULL,
    skill_upgrade_tier public.skill_upgrade_tier_type DEFAULT 'member',
    skill_upgrade_expiry timestamp with time zone,
    referral_code text UNIQUE,
    referred_by text,
    is_active boolean DEFAULT true,
    is_suspended boolean DEFAULT false,
    suspension_end_date timestamp with time zone,
    pending_verification boolean DEFAULT false,
    task_preference text DEFAULT 'all', -- 'standard', 'project', 'all'
    has_project_access boolean DEFAULT false, -- Granted via UniversalGeek or Hourly Qualification
    quality_rating numeric DEFAULT 5.0, -- 0.00 to 5.00 quality score
    completion_rate numeric DEFAULT 100, -- 0 to 100% completion/success rate
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- B. User Stats Table (Aggregated Metrics & Dual Ratings)
CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    tasks_completed integer DEFAULT 0,
    tasks_approved integer DEFAULT 0,
    tasks_rejected integer DEFAULT 0,
    tasks_cancelled integer DEFAULT 0,
    rating numeric DEFAULT 100, -- Legacy completion metric
    completion_rate numeric DEFAULT 100, -- 0-100% completion rate
    quality_rating numeric DEFAULT 5.0, -- 0.00 to 5.00 quality score
    updated_at timestamp with time zone DEFAULT now()
);

-- C. Tasks Table (Universal Definitions, Standard & Project-Based Tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
    id serial PRIMARY KEY,
    task_id text UNIQUE NOT NULL, -- ptg#YYYY#XXX
    title text NOT NULL,
    description text NOT NULL,
    category public.task_category_type NOT NULL,
    task_type text DEFAULT 'standard', -- 'standard' (fixed reward) or 'project' (hourly rate)
    url text,
    reward numeric NOT NULL DEFAULT 0.10, -- Base fixed reward
    hourly_rate numeric DEFAULT 0, -- Hourly rate for project tasks
    max_participants integer DEFAULT 1, -- Participant cap
    current_participants integer DEFAULT 0, -- Active claims countdown
    estimated_duration_minutes integer DEFAULT 30,
    required_skills jsonb DEFAULT '[]'::jsonb,
    project_structure jsonb DEFAULT '[]'::jsonb, -- Sections, subsections, questions
    instructions text,
    min_tier public.skill_upgrade_tier_type NOT NULL DEFAULT 'member',
    is_active boolean DEFAULT true,
    is_orientation boolean DEFAULT false,
    is_recommended boolean DEFAULT false,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- D. User Tasks Table (Progression, Time Tracking & Verification Evidence)
CREATE TABLE IF NOT EXISTS public.user_tasks (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    task_id integer REFERENCES public.tasks(id) ON DELETE CASCADE,
    status public.task_status_type DEFAULT 'pending',
    rejection_reason text,
    feedback text, -- For revision requests
    submission_description text,
    quality_rating numeric, -- Quality rating given by reviewer (0.00 - 5.00)
    time_spent_seconds integer DEFAULT 0, -- Active working time in seconds
    hourly_rate numeric DEFAULT 0, -- Hourly rate locked at claim time
    accrued_earnings numeric DEFAULT 0, -- Calculated working earnings
    project_responses jsonb DEFAULT '{}'::jsonb, -- Submitted section/subsection answers
    proof_attachments jsonb DEFAULT '[]'::jsonb, -- Array of proof upload objects
    feedback_attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- E. Subscriptions Table (Active Paid Credentialing)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    tier public.skill_upgrade_tier_type NOT NULL,
    amount numeric NOT NULL,
    payment_method text DEFAULT 'paypal',
    payment_reference text,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- F. Manual Subscriptions Table (Manual Payment Verification & Receipts)
CREATE TABLE IF NOT EXISTS public.manual_subscriptions (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    tier TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT DEFAULT 'manual',
    payment_reference TEXT,
    transaction_code TEXT, -- Canonical alias for reference code/hash
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- G. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id serial PRIMARY KEY,
    user_id uuid UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    available_balance numeric DEFAULT 0,
    pending_balance numeric DEFAULT 0,
    total_earnings numeric DEFAULT 0,
    total_withdrawn numeric DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

-- H. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    type public.transaction_type NOT NULL,
    amount numeric NOT NULL,
    status public.transaction_status_type DEFAULT 'pending',
    reference text,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- I. Withdrawals Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    payment_method_id integer,
    status public.transaction_status_type DEFAULT 'pending',
    admin_notes text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- J. Orders Table (PayPal Order Tracking)
CREATE TABLE IF NOT EXISTS public.orders (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    order_id text UNIQUE NOT NULL,
    payer_id text,
    payer_email text,
    amount numeric NOT NULL,
    currency text DEFAULT 'USD',
    status public.order_status_type DEFAULT 'pending',
    skill_upgrade_tier public.skill_upgrade_tier_type NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- K. Payment Methods Table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    type public.payment_method_type DEFAULT 'paypal',
    email text NOT NULL,
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- L. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL, -- 'task', 'payment', 'system', 'task_recommendation', etc.
    is_read boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- M. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now()
);

-- N. Assessment Submissions Table (Grammar, Hourly Qualification & Discipline Assessments)
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

-- O. Friends Table
CREATE TABLE IF NOT EXISTS public.friends (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    friend_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    status text CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- P. Task Recommendations Table
CREATE TABLE IF NOT EXISTS public.task_recommendations (
    id serial PRIMARY KEY,
    sender_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    task_id integer REFERENCES public.tasks(id) ON DELETE CASCADE,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Initial System Settings Seed
INSERT INTO public.system_settings (key, value, description)
VALUES ('allow_profile_editing', 'true'::jsonb, 'Allow users to edit their profile details')
ON CONFLICT (key) DO NOTHING;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_grammar_test ON public.users(grammar_test_passed, grammar_test_attempts);
CREATE INDEX IF NOT EXISTS idx_users_project_access ON public.users(has_project_access, task_preference);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks(task_type, is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_min_tier ON public.tasks(min_tier);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id_created_at ON public.user_tasks(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_tasks_quality_rating ON public.user_tasks(quality_rating);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_subscriptions_user_id ON public.manual_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_subscriptions_status ON public.manual_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_user_id ON public.assessment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_type ON public.assessment_submissions(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_discipline ON public.assessment_submissions(discipline_id);
CREATE INDEX IF NOT EXISTS idx_assessment_submissions_created_at ON public.assessment_submissions(created_at DESC);

-- 6. Helper Security Functions

-- Admin check function (Security Definer to prevent recursive RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger Functions

-- New User Initializer Trigger
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

-- Attach Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Admin Profile Setup RPC
CREATE OR REPLACE FUNCTION public.setup_admin_profile(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_email text;
  v_result json;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  INSERT INTO public.users (
    id, name, email, phone, gender, role, approval_status, verification_status,
    orientation_complete, grammar_test_passed, has_project_access, skill_upgrade_tier, skill_upgrade_expiry,
    quality_rating, completion_rate, is_active, is_suspended, created_at, updated_at
  )
  VALUES (
    p_user_id,
    'ADMIN',
    v_email,
    '+254724054460',
    'male',
    'admin',
    'approved',
    'verified',
    true,
    true,
    true,
    'vip',
    now() + interval '1 year',
    5.0,
    100,
    true,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = 'ADMIN',
    phone = '+254724054460',
    gender = 'male',
    role = 'admin',
    approval_status = 'approved',
    verification_status = 'verified',
    orientation_complete = true,
    grammar_test_passed = true,
    has_project_access = true,
    skill_upgrade_tier = 'vip',
    skill_upgrade_expiry = now() + interval '1 year',
    quality_rating = 5.0,
    completion_rate = 100,
    is_active = true,
    is_suspended = false,
    updated_at = now();

  INSERT INTO public.user_stats (user_id, tasks_completed, tasks_approved, rating, completion_rate, quality_rating, updated_at)
  VALUES (p_user_id, 0, 0, 100, 100, 5.0, now())
  ON CONFLICT (user_id) DO UPDATE SET
    rating = 100,
    completion_rate = 100,
    quality_rating = 5.0,
    updated_at = now();

  INSERT INTO public.wallets (user_id, available_balance, pending_balance, total_earnings, total_withdrawn)
  VALUES (p_user_id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT row_to_json(u) INTO v_result
  FROM public.users u
  WHERE id = p_user_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable Row-Level Security (RLS) on All Tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_submissions ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies

-- Service Role Full Access Policies (Bypasses for server-side logic)
DROP POLICY IF EXISTS "Service Role Full Access Users" ON public.users;
CREATE POLICY "Service Role Full Access Users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Full Access Tasks" ON public.tasks;
CREATE POLICY "Service Role Full Access Tasks" ON public.tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Full Access Settings" ON public.system_settings;
CREATE POLICY "Service Role Full Access Settings" ON public.system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Full Access Friends" ON public.friends;
CREATE POLICY "Service Role Full Access Friends" ON public.friends FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Full Access Recommendations" ON public.task_recommendations;
CREATE POLICY "Service Role Full Access Recommendations" ON public.task_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Full Access Assessment Submissions" ON public.assessment_submissions;
CREATE POLICY "Service Role Full Access Assessment Submissions" ON public.assessment_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service Role Full Access Manual Subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Service Role Full Access Manual Subscriptions" ON public.manual_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users Table Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users" ON public.users FOR UPDATE TO authenticated USING (public.is_admin());

-- Tasks Table Policies
DROP POLICY IF EXISTS "Users can view active tasks" ON public.tasks;
CREATE POLICY "Users can view active tasks" ON public.tasks FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL TO authenticated USING (public.is_admin());

-- User Tasks Table Policies
DROP POLICY IF EXISTS "Users can view own user_tasks" ON public.user_tasks;
CREATE POLICY "Users can view own user_tasks" ON public.user_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create user_tasks" ON public.user_tasks;
CREATE POLICY "Users can create user_tasks" ON public.user_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own user_tasks" ON public.user_tasks;
CREATE POLICY "Users can update own user_tasks" ON public.user_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage user_tasks" ON public.user_tasks;
CREATE POLICY "Admins can manage user_tasks" ON public.user_tasks FOR ALL TO authenticated USING (public.is_admin());

-- Subscriptions Table Policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create subscriptions" ON public.subscriptions;
CREATE POLICY "Users can create subscriptions" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Manual Subscriptions Table Policies
DROP POLICY IF EXISTS "Users can view own manual subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Users can view own manual subscriptions" ON public.manual_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own manual subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Users can insert own manual subscriptions" ON public.manual_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all manual subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Admins can view all manual subscriptions" ON public.manual_subscriptions FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update manual subscriptions" ON public.manual_subscriptions;
CREATE POLICY "Admins can update manual subscriptions" ON public.manual_subscriptions FOR UPDATE TO authenticated USING (public.is_admin());

-- Wallets Table Policies
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Transactions Table Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Withdrawals Table Policies
DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdrawals;
CREATE POLICY "Users can create withdrawals" ON public.withdrawals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage withdrawals" ON public.withdrawals;
CREATE POLICY "Admins can manage withdrawals" ON public.withdrawals FOR ALL TO authenticated USING (public.is_admin());

-- Orders Table Policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Payment Methods Table Policies
DROP POLICY IF EXISTS "Users can view own payment methods" ON public.payment_methods;
CREATE POLICY "Users can view own payment methods" ON public.payment_methods FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own payment methods" ON public.payment_methods;
CREATE POLICY "Users can manage own payment methods" ON public.payment_methods FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Notifications Table Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- System Settings Policies
DROP POLICY IF EXISTS "Users can view system settings" ON public.system_settings;
CREATE POLICY "Users can view system settings" ON public.system_settings FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Admins can update system settings" ON public.system_settings;
CREATE POLICY "Admins can update system settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_admin());

-- Friends Table Policies
DROP POLICY IF EXISTS "Users can view own friends" ON public.friends;
CREATE POLICY "Users can view own friends" ON public.friends FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
CREATE POLICY "Users can send friend requests" ON public.friends FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own friend requests" ON public.friends;
CREATE POLICY "Users can update own friend requests" ON public.friends FOR UPDATE TO authenticated USING (auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can delete own friend connections" ON public.friends;
CREATE POLICY "Users can delete own friend connections" ON public.friends FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Task Recommendations Policies
DROP POLICY IF EXISTS "Users can view received recommendations" ON public.task_recommendations;
CREATE POLICY "Users can view received recommendations" ON public.task_recommendations FOR SELECT TO authenticated USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send recommendations" ON public.task_recommendations;
CREATE POLICY "Users can send recommendations" ON public.task_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Assessment Submissions Policies
DROP POLICY IF EXISTS "Users can view own assessment submissions" ON public.assessment_submissions;
CREATE POLICY "Users can view own assessment submissions" ON public.assessment_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own assessment submissions" ON public.assessment_submissions;
CREATE POLICY "Users can insert own assessment submissions" ON public.assessment_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all assessment submissions" ON public.assessment_submissions;
CREATE POLICY "Admins can view all assessment submissions" ON public.assessment_submissions FOR SELECT TO authenticated USING (public.is_admin());

-- 10. Storage Buckets (Task Attachments & Proof Submissions)
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-submissions', 'proof-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Admins have full access to task-attachments" ON storage.objects;
CREATE POLICY "Admins have full access to task-attachments"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'task-attachments' AND public.is_admin())
WITH CHECK (bucket_id = 'task-attachments' AND public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can read task-attachments" ON storage.objects;
CREATE POLICY "Authenticated users can read task-attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Allow authenticated uploads to proof-submissions" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to proof-submissions"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'proof-submissions');

DROP POLICY IF EXISTS "Admins can view all proof-submissions" ON storage.objects;
CREATE POLICY "Admins can view all proof-submissions"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'proof-submissions' AND public.is_admin());

-- 11. Role Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT ON public.system_settings TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.assessment_submissions TO authenticated;
GRANT SELECT, INSERT ON public.manual_subscriptions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
