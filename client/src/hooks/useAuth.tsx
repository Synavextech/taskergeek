import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@shared/types";

interface CompleteAuthOptions {
  immediate?: boolean;
  redirect?: boolean;
  redirectPath?: string;
  supabaseUser?: SupabaseUser;
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
  getLoginRedirect: (user: User | null) => string;
  handlePostLoginRedirect: (user: User, immediate?: boolean) => void;
  completeAuthSession: (user: User, options?: CompleteAuthOptions) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const getLoginRedirect = (user: User | null): string => {
    if (!user) return '/auth';
    if (user.role === 'admin') return '/admin';
    if (user.approval_status !== 'approved') return '/waiting-approval';
    if (!user.orientation_complete) return '/orientation';
    return '/home';
  };

  /**
   * Centralized redirect handler - handles all auth redirects in the app
   */
  const handlePostLoginRedirect = (user: User, immediate: boolean = false, overridePath?: string) => {
    try {
      const redirect = overridePath || getLoginRedirect(user);
      console.log(`[AUTH] Redirecting ${user.email} to ${redirect} (immediate=${immediate})`);

      if (immediate) {
        setLocation(redirect);
      } else {
        setTimeout(() => setLocation(redirect), 100);
      }
    } catch (error) {
      console.error('[AUTH] Redirect error:', error);
      setLocation('/auth');
    }
  };

  // Timeout wrapper to guarantee async operations never hang
  const withTimeout = <T,>(promise: Promise<T> | PromiseLike<T>, ms: number, defaultValue: T): Promise<T> => {
    return Promise.race([
      Promise.resolve(promise),
      new Promise<T>((resolve) => setTimeout(() => resolve(defaultValue), ms))
    ]);
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('[AUTH] Initializing authentication...');
        const sessionRes = await withTimeout(
          supabase.auth.getSession(),
          2000,
          { data: { session: null }, error: null } as any
        );
        const session = sessionRes?.data?.session;

        if (session?.user && isMounted) {
          console.log('[AUTH] Session found, fetching user profile...');
          setSupabaseUser(session.user);

          const profileRes = await withTimeout(
            supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single(),
            2000,
            { data: null, error: null } as any
          );

          if (profileRes?.data && isMounted) {
            setUser(profileRes.data as User);
            console.log('[AUTH] User authenticated:', profileRes.data.email);
          } else if (isMounted) {
            console.warn('[AUTH] Profile not found via Supabase client, checking server session...');
            await checkServerSession();
          }
        } else if (isMounted) {
          console.log('[AUTH] No active Supabase session, checking server session...');
          await checkServerSession();
        }
      } catch (error) {
        console.error('[AUTH] Initialization error:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const checkServerSession = async () => {
      try {
        const res = await withTimeout(
          fetch('/api/auth/user', { credentials: 'include' }),
          2000,
          null
        );
        if (res && res.ok) {
          const data = await res.json();
          if (data.data?.user && isMounted) {
            console.log('[AUTH] Server session restored:', data.data.user.email);
            setUser(data.data.user);
            return;
          }
        }
        if (isMounted) {
          setSupabaseUser(null);
          setUser(null);
        }
      } catch (e) {
        console.warn("[AUTH] Server session check failed", e);
        if (isMounted) {
          setSupabaseUser(null);
          setUser(null);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        console.log(`[AUTH] Auth event: ${event}`);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            setSupabaseUser(session.user);
            if (!user || user.id !== session.user.id) {
              const profileRes = await withTimeout(
                supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single(),
                2000,
                { data: null, error: null } as any
              );

              if (profileRes?.data && isMounted) {
                setUser(profileRes.data as User);
              }
            }
          }
          if (isMounted) setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null);
          setUser(null);
          if (isMounted) setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSetUser = (userData: User | null, options?: { redirect?: string; immediate?: boolean }) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('protaskergeek-user', JSON.stringify(userData));
      if (options?.redirect) {
        handlePostLoginRedirect(userData, options.immediate ?? true, options.redirect);
      }
    } else {
      localStorage.removeItem('protaskergeek-user');
    }
  };

  const logout = async () => {
    console.log('[AUTH] Initiating user logout and session purge...');
    try {
      // 1. Immediately reset states
      setUser(null);
      setSupabaseUser(null);
      setIsLoading(false);

      // 2. Synchronously wipe all local and session storages
      try {
        localStorage.removeItem('protaskergeek-user');
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('protaskergeek') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
      } catch (storageErr) {
        console.warn('[AUTH] LocalStorage purge warning:', storageErr);
      }

      // 3. Clear react-query cache
      try {
        queryClient.clear();
      } catch (qe) {
        console.warn('[AUTH] queryClient clear warning:', qe);
      }

      // 4. Fire-and-forget backend and supabase signouts with max 500ms safety race
      const backendCall = fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      }).catch((e) => console.warn('[AUTH] Backend logout warning:', e));

      const supabaseCall = supabase.auth.signOut({ scope: 'local' })
        .catch((e) => console.warn('[AUTH] Supabase signOut warning:', e));

      await Promise.race([
        Promise.allSettled([backendCall, supabaseCall]),
        new Promise((resolve) => setTimeout(resolve, 500))
      ]);
    } catch (error) {
      console.error("[AUTH] Logout caught error:", error);
    } finally {
      // 5. Guaranteed immediate hard redirect to landing page
      window.location.replace('/');
    }
  };

  const value: AuthContextType = {
    user,
    supabaseUser,
    setUser: handleSetUser,
    logout,
    isLoading,
    getLoginRedirect,
    handlePostLoginRedirect,
    completeAuthSession: async (user: User, options?: CompleteAuthOptions) => {
      // Ensure Supabase session is set first if provided
      if (options?.supabaseUser) {
        setSupabaseUser(options.supabaseUser);
      }

      // Set user in state first
      setUser(user);
      localStorage.setItem('protaskergeek-user', JSON.stringify(user));

      // Only redirect if explicitly requested
      if (options?.redirect !== false) {
        // Add small delay to ensure session is fully established
        const delay = options?.immediate ? 150 : 300;

        setTimeout(async () => {
          // Verify session is actually established before redirecting
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            console.log('[AUTH] Session verified, proceeding with redirect');
            const redirectPath = options?.redirectPath || getLoginRedirect(user);
            handlePostLoginRedirect(user, true, redirectPath);
          } else {
            console.warn('[AUTH] Session not established yet, delaying redirect');
            // Try one more time after another delay
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (retrySession?.user) {
                const redirectPath = options?.redirectPath || getLoginRedirect(user);
                handlePostLoginRedirect(user, true, redirectPath);
              } else {
                console.error('[AUTH] Session establishment failed, redirecting anyway');
                const redirectPath = options?.redirectPath || getLoginRedirect(user);
                handlePostLoginRedirect(user, true, redirectPath);
              }
            }, 200);
          }
        }, delay);
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const useAuthActions = () => {
  const [error, setError] = useState<string | null>(null);
  const { setUser, completeAuthSession } = useAuth();

  // useAuthActions uses the centralized redirect handler from the AuthProvider context

  const register = async (name: string, phone: string, email: string, password: string, confirmPassword: string, gender: string, country?: string, referredBy?: string) => {
    try {
      setError(null);
      const body = { name, phone, email, password, confirmPassword, gender, country, referredBy }; // Explicit object
      if (!email || !password || password !== confirmPassword) {
        throw new Error('Invalid input');
      }


      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Handle registration response
      if (data.requiresConfirmation) {
        // Show message and do not navigate
        return {
          success: true,
          requiresConfirmation: true,
          message: data.message
        };
      }

      // User is registered, use centralized auth session completion
      if (data.data?.user) {
        // Set Supabase session first if provided
        if (data.data.session) {
          await supabase.auth.setSession(data.data.session);
        }

        // Use centralized handler for immediate user setting and redirect
        completeAuthSession(data.data.user, {
          immediate: true,
          redirect: true,
          supabaseUser: data.data.session?.user
        });
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return null; // Return null instead of throwing to prevent UI crashes
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || data.message || 'Login failed');
      }

      const loginUser = data.data?.user;

      if (loginUser) {
        // Set Supabase session first if provided
        if (data.data?.session) {
          await supabase.auth.setSession(data.data.session);
        }

        // Use centralized handler for immediate user setting and redirect
        completeAuthSession(loginUser, {
          immediate: true,
          redirect: true,
          supabaseUser: data.data?.session?.user
        });

        console.log(`Login successful, using centralized redirect handler`);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return null; // Return null instead of throwing to prevent UI crashes
    }
  };

  return { register, login, error };
};