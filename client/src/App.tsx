import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import DashboardPage from "@/pages/dashboard-page";
import AdminWebPage from "@/pages/admin-web-page";
import PropertyEntry from "@/pages/property-entry";
import PropertyConfirmation from "@/pages/property-confirmation";
import PropertiesPage from "@/pages/properties-page";
import ProfilePage from "@/pages/profile-page";
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
      <ProtectedRoute path="/admin/web" component={AdminWebPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    try {
      // Clean up potentially corrupted localStorage/sessionStorage entries
      const keysToCheck = ['react-query', 'auth-state', 'user-data'];
      
      keysToCheck.forEach(key => {
        try {
          const item = localStorage.getItem(key);
          if (item && item === '[object Object]') {
            console.log(`Removing corrupted localStorage item: ${key}`);
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`Error checking localStorage item ${key}:`, error);
        }
      });

      // Same for sessionStorage
      keysToCheck.forEach(key => {
        try {
          const item = sessionStorage.getItem(key);
          if (item && item === '[object Object]') {
            console.log(`Removing corrupted sessionStorage item: ${key}`);
            sessionStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`Error checking sessionStorage item ${key}:`, error);
        }
      });

    } catch (error) {
      console.error('Error during storage cleanup:', error);
    }
  }, []);

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