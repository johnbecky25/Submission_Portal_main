import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/context/useAuth";
import { isAdminRole } from "@/lib/roles";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

// Page Imports
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import AbstractsList from "@/pages/abstracts/index";
import AbstractNew from "@/pages/abstracts/new";
import AbstractDetail from "@/pages/abstracts/detail";
import ReviewsList from "@/pages/reviews/index";
import ReviewDetail from "@/pages/reviews/detail";
import UsersList from "@/pages/users/index";
import AuditLogsList from "@/pages/audit-logs/index";
import FormBuilder from "@/pages/form-builder/index";
import ImportPage from "@/pages/import/index";
import ChangePassword from "@/pages/change-password";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import ProgrammePublic from "@/pages/programme/public";
import ProgrammeAdmin from "@/pages/programme/admin";
import AdminSessions from "@/pages/admin/sessions";
import AdminSpeakers from "@/pages/admin/speakers";
import SpeakerPortal from "@/pages/speaker-portal";
import SettingsPage from "@/pages/settings/index";
import TicketCheck from "@/pages/ticket-check/index";
import TicketReceipt from "@/pages/ticket-receipt/index";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 flex items-center justify-center min-h-screen text-muted-foreground">Loading application state...</div>;
  if (!user) return <Redirect to="/login" />;
  if (user.mustChangePassword) return <Redirect to="/change-password" />;
  if (adminOnly && !isAdminRole(user.role)) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register"><Redirect to="/login" /></Route>
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/change-password" component={ChangePassword} />
        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/abstracts">
          <ProtectedRoute component={AbstractsList} />
        </Route>
        <Route path="/abstracts/new">
          <ProtectedRoute component={AbstractNew} adminOnly />
        </Route>
        <Route path="/abstracts/:id">
          <ProtectedRoute component={AbstractDetail} />
        </Route>
        <Route path="/reviews">
          <ProtectedRoute component={ReviewsList} />
        </Route>
        <Route path="/reviews/:id">
          <ProtectedRoute component={ReviewDetail} />
        </Route>
        <Route path="/users">
          <ProtectedRoute component={UsersList} />
        </Route>
        <Route path="/audit-logs">
          <ProtectedRoute component={AuditLogsList} />
        </Route>
        <Route path="/settings">
          <ProtectedRoute component={SettingsPage} adminOnly />
        </Route>
        <Route path="/form-builder">
          <ProtectedRoute component={FormBuilder} adminOnly />
        </Route>
        <Route path="/import">
          <ProtectedRoute component={ImportPage} adminOnly />
        </Route>
        <Route path="/programme" component={ProgrammePublic} />
        <Route path="/admin/programme">
          <ProtectedRoute component={ProgrammeAdmin} adminOnly />
        </Route>
        <Route path="/admin/sessions">
          <ProtectedRoute component={AdminSessions} adminOnly />
        </Route>
        <Route path="/admin/speakers">
          <ProtectedRoute component={AdminSpeakers} adminOnly />
        </Route>
        <Route path="/ticket-check">
          <ProtectedRoute component={TicketCheck} adminOnly />
        </Route>
        <Route path="/ticket-receipt/:id">
          <ProtectedRoute component={TicketReceipt} adminOnly />
        </Route>
        <Route path="/speaker/:token" component={SpeakerPortal} />
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.VITE_ROUTER_BASE || import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
