import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ErrorBoundary, AsyncErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoader } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import UpdatePassword from "@/pages/UpdatePassword";
import VerifyEmail from "@/pages/VerifyEmail";
import { Orientation } from "@/pages/Orientation";
import SkillUpgrade from "@/pages/SkillUpgrade";
import SkillUpgradeSuccess from "@/pages/SkillUpgradeSuccess";
import Home from "@/pages/Home";
import Tasks from "@/pages/Tasks";
import Wallet from "@/pages/Wallet";
import Notifications from "@/pages/Notifications";
import Admin from "@/pages/Admin";
import WaitingApproval from "@/pages/WaitingApproval";
import Suspended from "@/pages/Suspended";
import Terminated from "@/pages/Terminated";
import AboutUs from "@/pages/AboutUs";
import ContactUs from "@/pages/ContactUs";
import UserAgreement from "@/pages/UserAgreement";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import FAQ from "@/pages/FAQ";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Footer from "@/components/Footer";
import Profile from "@/pages/Profile";
import { RequireAuth } from "@/components/RequireAuth";

function AppRouter() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // Determine if on standalone authentication pages to ensure proper viewport fitting
  const isAuthFlowRoute = ['/auth', '/reset-password', '/update-password', '/auth/verify-email', '/waiting-approval', '/suspended', '/terminated'].includes(location);

  // Simplified status checks
  const isAdmin = user?.role === 'admin';
  const hasFullAccess = user && user.skill_upgrade_tier && user.approval_status === 'approved';

  return (
    <>
      <Switch>
        {/* Public routes - always accessible */}
        <Route path="/" component={Landing} />
        <Route path="/auth" component={Auth} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/update-password" component={UpdatePassword} />
        <Route path="/about" component={AboutUs} />
        <Route path="/contact" component={ContactUs} />
        <Route path="/user-agreement" component={UserAgreement} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/faq" component={FAQ} />

        {/* Authentication flow routes - always accessible to prevent 404s */}
        <Route path="/orientation" component={() => <Layout><Orientation /></Layout>} />
        <Route path="/auth/verify-email" component={VerifyEmail} />
        <Route path="/skill-upgrade" component={() => <Layout><SkillUpgrade /></Layout>} />
        <Route path="/skill-upgrade-success" component={() => <Layout><SkillUpgradeSuccess /></Layout>} />
        <Route path="/waiting-approval" component={WaitingApproval} />
        <Route path="/suspended" component={Suspended} />
        <Route path="/terminated" component={Terminated} />

        {/* Admin route - simple check */}
        <Route path="/admin" component={() =>
          isAdmin
            ? <Layout><Admin /></Layout>
            : <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4"> 404 error, Page not found</h1>
                <Button onClick={() => setLocation('/auth')} variant="outline"> Please Contact Admin
                </Button>
              </div>
            </div>
        } />

        {/* Protected routes - require authentication */}
        <Route path="/home" component={() => (
          <RequireAuth>
            <Layout><Home /></Layout>
          </RequireAuth>
        )} />

        <Route path="/tasks" component={() => (
          <RequireAuth>
            <Layout><Tasks /></Layout>
          </RequireAuth>
        )} />

        <Route path="/profile" component={() => (
          <RequireAuth>
            <Layout><Profile /></Layout>
          </RequireAuth>
        )} />

        <Route path="/wallet" component={() => (
          <RequireAuth>
            {hasFullAccess ? (
              <Layout><Wallet /></Layout>
            ) : (
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                  <p className="text-muted-foreground mb-4">Awaiting approval</p>
                  <Button onClick={() => setLocation('/home')} variant="outline">Go to Home</Button>
                </div>
              </div>
            )}
          </RequireAuth>
        )} />

        <Route path="/notifications" component={() => (
          <RequireAuth>
            {hasFullAccess ? (
              <Layout><Notifications /></Layout>
            ) : (
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                  <p className="text-muted-foreground mb-4">Awaiting approval</p>
                  <Button onClick={() => setLocation('/home')} variant="outline">Go to Home</Button>
                </div>
              </div>
            )}
          </RequireAuth>
        )} />

        {/* 404 fallback */}
        <Route component={() =>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404</h1>
              <p className="text-muted-foreground mb-4">Page not found</p>
              <Button onClick={() => setLocation('/')} variant="outline"> Back to Home
              </Button>
            </div>
          </div>
        } />
      </Switch>

      {!isAuthFlowRoute && (
        <div className="pb-24">
          <Footer />
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AsyncErrorBoundary>
        <AsyncErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ThemeProvider>
                <TooltipProvider>
                  <Toaster />
                  <AppRouter />
                </TooltipProvider>
              </ThemeProvider>
            </AuthProvider>
          </QueryClientProvider>
        </AsyncErrorBoundary>
      </AsyncErrorBoundary>
    </ErrorBoundary>
  );
}

export default App;
