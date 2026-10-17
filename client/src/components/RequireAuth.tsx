import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/LoadingSpinner";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const [, setLocation] = useLocation();
    const [isMounted, setIsMounted] = useState(false);
    const [hasTimedOut, setHasTimedOut] = useState(false);

    // Add stabilization delay to prevent race conditions
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsMounted(true);
        }, 100);

        // Maximum 2s timeout fallback so UI never hangs indefinitely on "Verifying session..."
        const safetyTimeout = setTimeout(() => {
            setHasTimedOut(true);
        }, 2000);

        return () => {
            clearTimeout(timer);
            clearTimeout(safetyTimeout);
        };
    }, []);

    const effectiveLoading = isLoading && !hasTimedOut;

    useEffect(() => {
        // Only redirect if mounted and loading is complete or timed out
        if (isMounted && !effectiveLoading) {
            if (!user) {
                console.log('[REQUIRE_AUTH] No user found, redirecting to /');
                // Use hard navigation to landing page to guarantee clean state
                window.location.replace('/');
                return;
            }

            // Redirect based on account status
            if (user.is_active === false) {
                console.log('[REQUIRE_AUTH] User deactivated, redirecting to /terminated');
                setLocation('/terminated');
                return;
            }

            if (user.is_suspended === true) {
                console.log('[REQUIRE_AUTH] User suspended, redirecting to /suspended');
                setLocation('/suspended');
                return;
            }
        }
    }, [user, effectiveLoading, isMounted, setLocation]);

    if (effectiveLoading || !isMounted) {
        return <PageLoader text="Verifying session..." />;
    }

    if (!user) {
        return null; // Will redirect to landing page
    }

    return <>{children}</>;
}
