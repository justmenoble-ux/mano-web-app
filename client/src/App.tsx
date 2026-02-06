import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useHousehold } from "@/hooks/use-household";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/Dashboard";
import Statements from "@/pages/Statements";
import Transactions from "@/pages/Transactions";
import Settings from "@/pages/Settings";
import Landing from "@/pages/Landing";
import Setup from "@/pages/Setup";
import NotFound from "@/pages/not-found";
import { InstallPrompt } from "@/components/InstallPrompt";

// Protected Route Wrapper with household check
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading: authLoading } = useAuth();
  const { data: household, isLoading: householdLoading } = useHousehold();

  if (authLoading || (user && householdLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/landing" />;
  }

  if (!household) {
    return <Redirect to="/setup" />;
  }

  return <Component />;
}

// Setup route - requires auth but no household yet
function SetupRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading: authLoading } = useAuth();
  const { data: household, isLoading: householdLoading } = useHousehold();

  if (authLoading || (user && householdLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/landing" />;
  }

  if (household) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

// Redirect if already logged in
function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (user) {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/landing">
        <PublicRoute component={Landing} />
      </Route>

      <Route path="/setup">
        <SetupRoute component={Setup} />
      </Route>

      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/statements">
        <ProtectedRoute component={Statements} />
      </Route>

      <Route path="/transactions">
        <ProtectedRoute component={Transactions} />
      </Route>

      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <InstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
