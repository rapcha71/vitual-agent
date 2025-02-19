import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useLoginMutation>;
  logoutMutation: ReturnType<typeof useLogoutMutation>;
  registerMutation: ReturnType<typeof useRegisterMutation>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

function useLoginMutation() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Usuario o contraseña inválidos");
      }
      return res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error de inicio de sesión",
        description: error.message || "Por favor verifica tu usuario y contraseña",
        variant: "destructive",
      });
    },
  });
}

function useLogoutMutation() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al cerrar sesión");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      setLocation("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message || "Por favor intenta nuevamente",
        variant: "destructive",
      });
    },
  });
}

function useRegisterMutation() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error en el registro");
      }
      return res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error de registro",
        description: error.message || "Por favor intenta con un usuario diferente",
        variant: "destructive",
      });
    },
  });
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error("Error al obtener datos del usuario");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    staleTime: 30000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const registerMutation = useRegisterMutation();

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
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