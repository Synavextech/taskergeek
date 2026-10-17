import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { Request, Response } from 'express';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error("Missing Supabase configuration:");
  console.error("- SUPABASE_URL:", supabaseUrl ? " Set" : " Missing");
  console.error("- SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? " Set" : " Missing");
  console.error("- SUPABASE_ANON_KEY:", supabaseAnonKey ? " Set" : " Missing");
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY are required");
}

/**
 * Creates a request-scoped Supabase client using @supabase/ssr.
 * This ensures that RLS is respected based on the user's session cookie.
 */
export function getSupabaseClient(req: Request, res: Response) {
  return createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          return req.cookies?.[name];
        },
        set(name: string, value: string, options: CookieOptions) {
          if (res.headersSent) return;
          try {
            res.cookie(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          } catch {
            // Ignore if headers already sent
          }
        },
        remove(name: string, options: CookieOptions) {
          if (res.headersSent) return;
          try {
            res.clearCookie(name, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          } catch {
            // Ignore if headers already sent
          }
        },
      },
    }
  );
}

/**
 * Creates a standalone non-SSR Supabase client with the anon key.
 * Safe for background/API operations without touching Express response cookies.
 */
export function createAnonClient(): SupabaseClient {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Creates a privileged Supabase client with the service role key.
 * Use this ONLY for admin actions that need to bypass RLS.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Helper to call RPC functions using a privileged client.
 */
export async function callRPC(client: SupabaseClient, functionName: string, params: any = {}) {
  const { data, error } = await client.rpc(functionName, params);

  if (error) {
    console.error(`RPC function ${functionName} error:`, error);
    throw error;
  }
  return data;
}

/**
 * Helper to execute raw SQL (via RPC) using a privileged client.
 */
export async function executeQuery(client: SupabaseClient, query: string, params: any[] = []) {
  try {
    const { data, error } = await client.rpc('execute_sql', {
      query,
      params
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}