import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/layout/AppLayout';

// Public landing page
import Landing from '@/pages/Landing';

// Auth pages
import Login from '@/pages/auth/Login';
import Signup from '@/pages/auth/Signup';

// Recruiter portal pages
import Dashboard from '@/pages/Dashboard';
import Jobs from '@/pages/Jobs';
import JobDetail from '@/pages/JobDetail';
import Candidates from '@/pages/Candidates';
import CandidateDetail from '@/pages/CandidateDetail';
import Workflows from '@/pages/Workflows';
import WorkflowDetail from '@/pages/WorkflowDetail';
import Chat from '@/pages/Chat';
import Settings from '@/pages/Settings';

// New recruiter pages (will be created by subagents)
import Analytics from '@/pages/Analytics';
import Notifications from '@/pages/Notifications';
import CandidateComparison from '@/pages/CandidateComparison';

// Public portal pages (no auth)
import PublicJobs from '@/pages/public/PublicJobs';
import PublicJobDetail from '@/pages/public/PublicJobDetail';
import Apply from '@/pages/public/Apply';
import ApplicationProcessing from '@/pages/public/ApplicationProcessing';

import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Landing page — default public entry point */}
      <Route path="/" component={Landing} />

      {/* Auth */}
      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/signup" component={() => <PublicRoute component={Signup} />} />

      {/* Public job portal — no auth */}
      <Route path="/public" component={PublicJobs} />
      <Route path="/public/jobs/:id" component={PublicJobDetail} />
      <Route path="/apply/:jobId/processing/:workflowId" component={ApplicationProcessing} />
      <Route path="/apply/:jobId" component={Apply} />

      {/* Recruiter portal — protected */}
      <Route path="/dashboard" component={() => <AppLayout><Dashboard /></AppLayout>} />
      <Route path="/jobs" component={() => <AppLayout><Jobs /></AppLayout>} />
      <Route path="/jobs/:id" component={() => <AppLayout><JobDetail /></AppLayout>} />
      <Route path="/candidates/compare" component={() => <AppLayout><CandidateComparison /></AppLayout>} />
      <Route path="/candidates/:id" component={() => <AppLayout><CandidateDetail /></AppLayout>} />
      <Route path="/candidates" component={() => <AppLayout><Candidates /></AppLayout>} />
      <Route path="/workflows/:id" component={() => <AppLayout><WorkflowDetail /></AppLayout>} />
      <Route path="/workflows" component={() => <AppLayout><Workflows /></AppLayout>} />
      <Route path="/analytics" component={() => <AppLayout><Analytics /></AppLayout>} />
      <Route path="/notifications" component={() => <AppLayout><Notifications /></AppLayout>} />
      <Route path="/chat" component={() => <AppLayout><Chat /></AppLayout>} />
      <Route path="/settings" component={() => <AppLayout><Settings /></AppLayout>} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
