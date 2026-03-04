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

const AdminWebPage = lazy(() => import("@/pages/admin-web-page"));
const PropertyEntry = lazy(() => import("@/pages/property-entry"));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Loader2 className="h-10 w-10 animate-spin text-[#F05023]" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/" component={HomePage} />
        <ProtectedRoute path="/dashboard" component={DashboardPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/property/new" component={PropertyEntry} />
        <ProtectedRoute path="/property-confirmation/:id" component={PropertyConfirmation} />
        <ProtectedRoute path="/properties" component={PropertiesPage} />
        <ProtectedRoute path="/admin" component={AdminWebPage} />
        <ProtectedRoute path="/admin/web" component={AdminWebPage} />
        <ProtectedRoute path="/messages" component={MessagesPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BadgeHandler />
          <PwaInstallBanner />
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;