
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, ChevronLeft, LogOut, Pencil, X, Check, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ProfileUpdate = {
  fullName?: string | null;
  mobile?: string | null;
  nickname?: string | null;
  username?: string | null;
};

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<ProfileUpdate>({
    fullName: user?.fullName ?? "",
    mobile: user?.mobile ?? "",
    nickname: user?.nickname ?? "",
    username: user?.username ?? "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al actualizar");
      }
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      setIsEditing(false);
      toast({
        title: "Perfil actualizado",
        description: "Tu información se guardó correctamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = () => {
    setEditValues({
      fullName: user?.fullName ?? "",
      mobile: user?.mobile ?? "",
      nickname: user?.nickname ?? "",
      username: user?.username ?? "",
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    updateProfileMutation.mutate({
      fullName: (editValues.fullName ?? "").trim() || null,
      mobile: (editValues.mobile ?? "").trim() || null,
      nickname: (editValues.nickname ?? "").trim() || null,
      username: (editValues.username ?? "").trim() || null,
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-[#F05023] px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            className="text-white hover:text-white/80 p-0 relative z-10"
            onClick={() => setLocation("/")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <img
              src="/assets/logo-full.png"
              alt="Virtual Agent"
              className="h-14 w-auto max-w-[60vw] object-contain header-logo-2x"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:text-white/80 p-0 relative z-10"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div
        className="p-4 bg-cover bg-center bg-no-repeat min-h-[calc(100vh-76px)] max-w-7xl mx-auto"
        style={{ backgroundImage: 'url("/assets/ciudad-optimized.webp")' }}
      >
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2">
                <User className="w-6 h-6" />
                Perfil de Usuario
              </CardTitle>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleStartEdit}
                >
                  <Pencil className="h-4 w-4" />
                  Editar Información
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={handleCancelEdit}
                    disabled={updateProfileMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2 bg-[#F05023] hover:bg-[#E04015]"
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Guardar
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Información del Usuario</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <span className="text-muted-foreground md:pt-2">Usuario (Correo):</span>
                  {isEditing ? (
                      <Input
                        type="email"
                        value={editValues.username ?? ""}
                        autoComplete="username"
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, username: e.target.value }))
                        }
                        placeholder="correo@ejemplo.com"
                        className="max-w-xs"
                      />
                  ) : (
                    <span className="font-medium">{user?.username}</span>
                  )}

                  <span className="text-muted-foreground md:pt-2">Nombre Completo:</span>
                  {isEditing ? (
                    <Input
                      value={editValues.fullName ?? ""}
                      autoComplete="name"
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      placeholder="Nombre completo"
                      className="max-w-xs"
                    />
                  ) : (
                    <span>{user?.fullName || "No establecido"}</span>
                  )}

                  <span className="text-muted-foreground md:pt-2">Teléfono:</span>
                  {isEditing ? (
                    <Input
                      value={editValues.mobile ?? ""}
                      autoComplete="tel"
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, mobile: e.target.value }))
                      }
                      placeholder="Teléfono"
                      type="tel"
                      className="max-w-xs"
                    />
                  ) : (
                    <span>{user?.mobile || "No establecido"}</span>
                  )}

                  <span className="text-muted-foreground md:pt-2">Alias:</span>
                  {isEditing ? (
                    <Input
                      name="nickname"
                      value={editValues.nickname ?? ""}
                      onChange={(e) =>
                        setEditValues((prev) => ({ ...prev, nickname: e.target.value }))
                      }
                      placeholder="Ingrese su alias"
                      className="max-w-xs"
                      autoComplete="nickname"
                      disabled={false}
                    />
                  ) : (
                    <span>{user?.nickname || "No establecido"}</span>
                  )}

                  <span className="text-muted-foreground md:pt-2">Último Acceso:</span>
                  <span>
                    {user?.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString()
                      : "Nunca"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
