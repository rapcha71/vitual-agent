import { createContext, ReactNode, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoginSuccessAnimation } from "@/components/ui/login-success-animation";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  showingLoginAnimation: boolean;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [showingLoginAnimation, setShowingLoginAnimation] = useState(false);

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false, // No reintentar en caso de error 401
    staleTime: 30000, // Datos válidos por 30 segundos
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Attempting login for user:", credentials.username);
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const error = await res.json();
        console.error("Login API error:", error);
        throw new Error(error.message || "Usuario o contraseña inválidos");
      }
      const data = await res.json();
      console.log("Login successful");
      return data;
    },
    onSuccess: (user: SelectUser) => {
      console.log("Login mutation succeeded, updating user data");
      queryClient.setQueryData(["/api/user"], user);
      setShowingLoginAnimation(true);
      setTimeout(() => {
        setShowingLoginAnimation(false);
      }, 2000);
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Error de inicio de sesión",
        description: error.message || "Por favor verifica tu usuario y contraseña",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log("Attempting registration for user:", credentials.username);
      const res = await apiRequest("POST", "/api/register", credentials);
      if (!res.ok) {
        const error = await res.json();
        console.error("Registration API error:", error);
        throw new Error(error.message || "Error en el registro");
      }
      const data = await res.json();
      console.log("Registration successful");
      return data;
    },
    onSuccess: (user: SelectUser) => {
      console.log("Registration mutation succeeded, updating user data");
      queryClient.setQueryData(["/api/user"], user);
      setShowingLoginAnimation(true);
      setTimeout(() => {
        setShowingLoginAnimation(false);
      }, 2000);
    },
    onError: (error: Error) => {
      console.error("Registration mutation error:", error);
      toast({
        title: "Error de registro",
        description: error.message || "Por favor intenta con un usuario diferente",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("Attempting logout");
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const error = await res.json();
        console.error("Logout API error:", error);
        throw new Error(error.message || "Error al cerrar sesión");
      }
    },
    onSuccess: () => {
      console.log("Logout successful, clearing user data");
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear(); // Limpiar toda la caché al cerrar sesión
    },
    onError: (error: Error) => {
      console.error("Logout mutation error:", error);
      toast({
        title: "Error al cerrar sesión",
        description: error.message || "Por favor intenta nuevamente",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        showingLoginAnimation,
      }}
    >
      {showingLoginAnimation && <LoginSuccessAnimation />}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}