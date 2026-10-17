-- ProtaskerGeek Database Schema
-- Run this in Supabase SQL Editor

-- Ensure public schema exists
CREATE SCHEMA IF NOT EXISTS public;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create custom types
DO $$ BEGIN
    CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'geek');
    CREATE TYPE public.role_type AS ENUM ('user', 'admin');
    CREATE TYPE public.approval_status_type AS ENUM ('pending', 'approved', 'rejected');
    CREATE TYPE public.skill_upgrade_tier_type AS ENUM ('member', 'silver', 'bronze', 'diamond', 'gold', 'vip');
    CREATE TYPE public.task_category_type AS ENUM ('main', 'social', 'surveys', 'testing', 'ai', 'app');
    CREATE TYPE public.task_status_type AS ENUM ('pending', 'approved', 'rejected', 'claimed', 'revision_requested', 'cancelled', 'submitted');
    CREATE TYPE public.transaction_type AS ENUM ('earning', 'withdrawal', 'referral', 'skill-upgrade');
    CREATE TYPE public.transaction_status_type AS ENUM ('pending', 'completed', 'failed');
    CREATE TYPE public.order_status_type AS ENUM ('pending', 'completed', 'failed', 'refunded');
    CREATE TYPE public.payment_method_type AS ENUM ('paypal');
    CREATE TYPE public.skill_upgrade_status_type AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Tables

-- Users Table
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
    orientation_complete boolean DEFAULT 'false',
    skill_upgrade_tier public.skill_upgrade_tier_type,
    skill_upgrade_expiry timestamp with time zone,
    referral_code text UNIQUE,
    referred_by text,
    is_active boolean DEFAULT true,
    is_suspended boolean DEFAULT false,
    suspension_end_date timestamp with time zone,
    pending_verification boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- User Stats Table
CREATE TABLE IF NOT EXISTS public.user_stats (
    user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    tasks_completed integer DEFAULT 0,
    tasks_approved integer DEFAULT 0,
    rating numeric DEFAULT 100,
    updated_at timestamp with time zone DEFAULT now()
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id serial PRIMARY KEY,
    task_id text UNIQUE NOT NULL, -- ptg#YYYY#XXX
    title text NOT NULL,
    description text NOT NULL,
    category public.task_category_type NOT NULL,
    url text,
    reward numeric NOT NULL,
    min_tier public.skill_upgrade_tier_type NOT NULL,
    is_active boolean DEFAULT true,
    is_orientation boolean DEFAULT false,
    is_recommended boolean DEFAULT false,
    attachments jsonb DEFAULT '[]'::jsonb, -- Array of attachment objects { name, url, type }
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- User Tasks Table
CREATE TABLE IF NOT EXISTS public.user_tasks (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    task_id integer REFERENCES public.tasks(id) ON DELETE CASCADE,
    status public.task_status_type DEFAULT 'pending',
    rejection_reason text,
    feedback text, -- For revisions
    submission_description text,
    proof_attachments jsonb DEFAULT '[]'::jsonb, -- Array of proof objects
    feedback_attachments jsonb DEFAULT '[]'::jsonb, -- Array of feedback objects
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    tier public.skill_upgrade_tier_type NOT NULL,
    amount numeric NOT NULL,
    payment_method public.payment_method_type DEFAULT 'paypal',
    payment_reference text,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id serial PRIMARY KEY,
    user_id uuid UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    available_balance numeric DEFAULT 0,
    pending_balance numeric DEFAULT 0,
    total_earnings numeric DEFAULT 0,
    total_withdrawn numeric DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

-- Transactions Table
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

-- Withdrawals Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    payment_method_id integer, -- FK references payment_methods below
    status public.transaction_status_type DEFAULT 'pending',
    admin_notes text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Orders Table
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

-- Payment Methods Table
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

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL, -- 'task', 'payment', 'system', etc.
    is_read boolean DEFAULT false,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now()
);

-- Social Features (Friends & Recommendations)
CREATE TABLE IF NOT EXISTS public.friends (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    friend_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    status text CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS public.task_recommendations (
    id serial PRIMARY KEY,
    sender_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    task_id integer REFERENCES public.tasks(id) ON DELETE CASCADE,
    message text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Default Data
INSERT INTO public.system_settings (key, value, description)
VALUES ('allow_profile_editing', 'true'::jsonb, 'Allow users to edit their profile details')
ON CONFLICT (key) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_recommendations ENABLE ROW LEVEL SECURITY;

-- 5. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id_created_at ON public.user_tasks(user_id, created_at);

-- 6. Policies
-- Service Role Policies (Full Access)
CREATE POLICY "Service Role Full Access Users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Tasks" ON public.tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service Role Full Access Settings" ON public.system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage friends" ON public.friends FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage recommendations" ON public.task_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Friends Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own friends" ON public.friends;
    CREATE POLICY "Users can view own friends" ON public.friends
        FOR SELECT TO authenticated USING (
            (SELECT auth.uid()) = user_id OR (SELECT auth.uid()) = friend_id
        );

    DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
    CREATE POLICY "Users can send friend requests" ON public.friends
        FOR INSERT TO authenticated WITH CHECK (
            (SELECT auth.uid()) = user_id
        );

    DROP POLICY IF EXISTS "Users can update own friend requests" ON public.friends;
    CREATE POLICY "Users can update own friend requests" ON public.friends
        FOR UPDATE TO authenticated USING (
            (SELECT auth.uid()) = friend_id
        );

    DROP POLICY IF EXISTS "Users can delete own friend connections" ON public.friends;
    CREATE POLICY "Users can delete own friend connections" ON public.friends
        FOR DELETE TO authenticated USING (
            (SELECT auth.uid()) = user_id OR (SELECT auth.uid()) = friend_id
        );
END $$;

-- Task Recommendations Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view received recommendations" ON public.task_recommendations;
    CREATE POLICY "Users can view received recommendations" ON public.task_recommendations
        FOR SELECT TO authenticated USING (
            (SELECT auth.uid()) = receiver_id
        );

    DROP POLICY IF EXISTS "Users can send recommendations" ON public.task_recommendations;
    CREATE POLICY "Users can send recommendations" ON public.task_recommendations
        FOR INSERT TO authenticated WITH CHECK (
            (SELECT auth.uid()) = sender_id
        );
END $$;
-- Tasks Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view active tasks" ON public.tasks;
    CREATE POLICY "Users can view active tasks" ON public.tasks
        FOR SELECT TO authenticated USING (
            is_active = true
            AND (
              -- Helper to check tier access logic roughly matches application logic
              -- Ideally this should be more robust or rely on app logic, but basic visibility check:
              min_tier = 'member' OR
              (SELECT skill_upgrade_tier FROM public.users WHERE id = auth.uid()) IS NOT NULL
            )
        );
END $$;

-- Users Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
    CREATE POLICY "Users can view own profile" ON public.users
        FOR SELECT TO authenticated USING (
             auth.uid() = id
        );

    DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
    CREATE POLICY "Users can update own profile" ON public.users
        FOR UPDATE TO authenticated USING (
             auth.uid() = id
        );
END $$;

-- Notifications Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
    CREATE POLICY "Users can view own notifications" ON public.notifications
        FOR SELECT TO authenticated USING (
             auth.uid() = user_id
        );

    DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
    CREATE POLICY "Users can update own notifications" ON public.notifications
        FOR UPDATE TO authenticated USING (
             auth.uid() = user_id
        );
END $$;

-- User Tasks Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own user_tasks" ON public.user_tasks;
    CREATE POLICY "Users can view own user_tasks" ON public.user_tasks
        FOR SELECT TO authenticated USING (
             auth.uid() = user_id
        );
    
    DROP POLICY IF EXISTS "Users can create user_tasks" ON public.user_tasks;
    CREATE POLICY "Users can create user_tasks" ON public.user_tasks
        FOR INSERT TO authenticated WITH CHECK (
             auth.uid() = user_id
        );

    DROP POLICY IF EXISTS "Users can update own user_tasks" ON public.user_tasks;
    CREATE POLICY "Users can update own user_tasks" ON public.user_tasks
        FOR UPDATE TO authenticated USING (
             auth.uid() = user_id
        );
END $$;

-- Subscription Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
    CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
        FOR SELECT TO authenticated USING (
             auth.uid() = user_id
        );
    
    DROP POLICY IF EXISTS "Users can create subscriptions" ON public.subscriptions;
    CREATE POLICY "Users can create subscriptions" ON public.subscriptions
        FOR INSERT TO authenticated WITH CHECK (
             auth.uid() = user_id
        );
END $$;

-- Wallets Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
    CREATE POLICY "Users can view own wallet" ON public.wallets
        FOR SELECT TO authenticated USING (
             auth.uid() = user_id
        );
END $$;

-- Transactions Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
    CREATE POLICY "Users can view own transactions" ON public.transactions
        FOR SELECT TO authenticated USING (
             auth.uid() = user_id
        );
END $$;

-- Withdrawals Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
    CREATE POLICY "Users can view own withdrawals" ON public.withdrawals
        FOR SELECT TO authenticated USING (
             auth.uid() = user_id
        );

    DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdrawals;
    CREATE POLICY "Users can create withdrawals" ON public.withdrawals
        FOR INSERT TO authenticated WITH CHECK (
             auth.uid() = user_id
        );
END $$;

-- Orders Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
    CREATE POLICY "Users can view own orders" ON public.orders
        FOR SELECT TO authenticated USING (
             auth.uid() = user_id
        );
    
    DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
    CREATE POLICY "Users can create orders" ON public.orders
        FOR INSERT TO authenticated WITH CHECK (
             auth.uid() = user_id
        );
END $$;

-- Payment Methods Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own payment methods" ON public.payment_methods;
    CREATE POLICY "Users can view own payment methods" ON public.payment_methods
        FOR SELECT TO authenticated USING (
             auth.uid() = user_id
        );
        
    DROP POLICY IF EXISTS "Users can manage own payment methods" ON public.payment_methods;
    CREATE POLICY "Users can manage own payment methods" ON public.payment_methods
        FOR ALL TO authenticated USING (
             auth.uid() = user_id
        );
END $$;

-- Update System Settings RLS Policy
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view system settings" ON public.system_settings;
    CREATE POLICY "Users can view system settings" ON public.system_settings
        FOR SELECT TO authenticated USING (true);
END $$;

-- 6. RPC Functions
CREATE OR REPLACE FUNCTION public.drop_auth_trigger()
RETURNS void AS $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_referral_code text;
BEGIN
  -- Generate a simplified referral code (first 4 chars of email + random number)
  -- In production, might want something more robust
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
    skill_upgrade_tier,
    referral_code,
    referred_by,
    is_active,
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
    'pending', -- Default approval status
    'unverified',
    false,
    'member', -- Default skill upgrade tier
    new_referral_code,
    NEW.raw_user_meta_data->>'referred_by',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create User Stats
  INSERT INTO public.user_stats (user_id, tasks_completed, tasks_approved, rating, updated_at)
  VALUES (NEW.id, 0, 0, 100, now())
  ON CONFLICT (user_id) DO NOTHING;

  -- Create Wallet
  INSERT INTO public.wallets (user_id, available_balance, pending_balance, total_earnings, total_withdrawn, updated_at)
  VALUES (NEW.id, 0, 0, 0, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error (visible in Supabase logs)
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_auth_trigger()
RETURNS void AS $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.setup_admin_profile(p_user_id uuid)
RETURNS json AS $$
DECLARE
  v_email text;
  v_result json;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  INSERT INTO public.users (id, name, email, phone, gender, role, approval_status, verification_status, orientation_complete, skill_upgrade_tier, skill_upgrade_expiry, is_active, is_suspended, created_at, updated_at)
  VALUES (
    p_user_id,
    'ADMIN',
    v_email,
    '+254723858906',
    'male',
    'admin',
    'approved',
    'verified',
    true,
    'vip',
    now() + interval '1 year',
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
    skill_upgrade_tier = 'vip',
    skill_upgrade_expiry = now() + interval '1 year',
    is_active = true,
    is_suspended = false,
    updated_at = now();

  INSERT INTO public.user_stats (user_id, tasks_completed, tasks_approved, rating, updated_at)
  VALUES (p_user_id, 0, 0, 100, now())
  ON CONFLICT (user_id) DO UPDATE SET
    rating = 100,
    updated_at = now();

  -- Create default wallet for admin
  INSERT INTO public.wallets (user_id, available_balance, pending_balance, total_earnings, total_withdrawn)
  VALUES (p_user_id, 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT row_to_json(u) INTO v_result
  FROM public.users u
  WHERE id = p_user_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.drop_auth_trigger() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_auth_trigger() TO service_role;
GRANT EXECUTE ON FUNCTION public.setup_admin_profile(uuid) TO service_role;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.system_settings TO authenticated, anon;
CREATE TABLE IF NOT EXISTS public.manual_subscriptions (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    tier TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_method TEXT DEFAULT 'manual',
    payment_reference TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.manual_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own manual subscriptions"
    ON public.manual_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own manual subscriptions"
    ON public.manual_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all manual subscriptions"
    ON public.manual_subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
        )
    );

CREATE POLICY "Admins can update manual subscriptions"
    ON public.manual_subscriptions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid() AND public.users.role = 'admin'
        )
    );

-- Non-recursive Admin Policy using Security Definer function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
FOR SELECT TO authenticated USING (public.is_admin());



-- 1. Create Buckets
-- Note: 'public' property makes files accessible without a signed URL if desired, 
-- but RLS is used here for security.

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-submissions', 'proof-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS Policies for task-attachments
-- Admins can do everything; Authenticated users can only read.

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

CREATE POLICY "Authenticated users can read task-attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');

-- 3. Set up RLS Policies for proof-submissions
-- Users can upload files; Admins and the original uploader (if tracked) can read.

CREATE POLICY "Allow authenticated uploads to proof-submissions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proof-submissions');

CREATE POLICY "Admins can view all proof-submissions"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'proof-submissions' AND
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
