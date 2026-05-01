import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { BadgeHandler } from "./components/badge-handler";
import { ErrorBoundary } from "./components/error-boundary";
import { PwaInstallBanner } from "./components/pwa-install-banner";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DashboardPage from "@/pages/dashboard-page";
import PropertyConfirmation from "@/pages/property-confirmation";
import PropertiesPage from "@/pages/properties-page";
import ProfilePage from "@/pages/profile-page";
import MessagesPage from "@/pages/messages-page";
import { ProtectedRoute } from "./lib/protected-route";

// Heavy pages: code-split so they don't bloat the initial bundle
const AdminWebPage = lazy(() => import("@/pages/admin-web-page"));
const PropertyEntry = lazy(() => import("@/pages/property-entry"));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Loader2 className="h-10 w-10 animate-spin text-[#F05023]" />
    </div>
  );
}

// Stable named wrappers avoid inline-lambda remount issues (new ref on every render)
const HomePageWrapped      = () => <ErrorBoundary><HomePage /></ErrorBoundary>;
const DashboardWrapped     = () => <ErrorBoundary><DashboardPage /></ErrorBoundary>;
const ProfileWrapped       = () => <ErrorBoundary><ProfilePage /></ErrorBoundary>;
const PropertyEntryWrapped = () => <ErrorBoundary><PropertyEntry /></ErrorBoundary>;
const ConfirmationWrapped  = () => <ErrorBoundary><PropertyConfirmation /></ErrorBoundary>;
const PropertiesWrapped    = () => <ErrorBoundary><PropertiesPage /></ErrorBoundary>;
const AdminWrapped         = () => <ErrorBoundary><AdminWebPage /></ErrorBoundary>;
const MessagesWrapped      = () => <ErrorBoundary><MessagesPage /></ErrorBoundary>;

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/" component={HomePageWrapped} />
        <ProtectedRoute path="/dashboard" component={DashboardWrapped} />
        <ProtectedRoute path="/profile" component={ProfileWrapped} />
        <ProtectedRoute path="/property/new" component={PropertyEntryWrapped} />
        <ProtectedRoute path="/property-confirmation/:id" component={ConfirmationWrapped} />
        <ProtectedRoute path="/properties" component={PropertiesWrapped} />
        <ProtectedRoute path="/admin" component={AdminWrapped} />
        <ProtectedRoute path="/admin/web" component={AdminWrapped} />
        <ProtectedRoute path="/messages" component={MessagesWrapped} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <div id="app-root">
          <AuthProvider>
            <BadgeHandler />
            <PwaInstallBanner />
            <Router />
          </AuthProvider>
        </div>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;