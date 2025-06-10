import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { useConnectionGuard } from "./hooks/use-connection-guard";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DashboardPage from "@/pages/dashboard-page";
import AdminWebPage from "@/pages/admin-web-page";
import PropertyEntry from "@/pages/property-entry";
import PropertyConfirmation from "@/pages/property-confirmation";
import PropertiesPage from "@/pages/properties-page";
import ProfilePage from "@/pages/profile-page";
import QRPage from "@/pages/qr-page";
import ShareAppPage from "@/pages/share-app-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
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
      <ProtectedRoute path="/share" component={ShareAppPage} />
      <Route path="/qr" component={QRPage} />
      <Route path="/qr-generator" component={QRPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Activar protección de conexión
  useConnectionGuard();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;