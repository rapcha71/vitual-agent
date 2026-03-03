
import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, Key } from "lucide-react";

interface PasswordResetProps {
  onBackToLogin: () => void;
}

export function PasswordReset({ onBackToLogin }: PasswordResetProps) {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu correo electrónico",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Código enviado",
          description: data.message,
        });
        
        // For demo purposes, show the code
        if (data.resetCode) {
          toast({
            title: "Código de recuperación (Demo)",
            description: `Tu código es: ${data.resetCode}`,
            duration: 10000,
          });
        }
        
        setStep("reset");
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al solicitar recuperación",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetCode || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: email,
          resetCode,
          newPassword,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Contraseña actualizada exitosamente",
        });
        onBackToLogin();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar contraseña",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "request") {
    return (
      <div className="space-y-4 bg-white/95 backdrop-blur-sm rounded-lg p-4">
        <div className="text-center space-y-2">
          <Mail className="h-8 w-8 mx-auto text-[#F05023]" />
          <h2 className="text-lg font-semibold">Recuperar Contraseña</h2>
          <p className="text-sm text-gray-600">
            Ingresa tu correo electrónico para recibir un código de recuperación
          </p>
        </div>

        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Código"
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onBackToLogin}
            disabled={isLoading}
          >
            Volver al Login
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-white/95 backdrop-blur-sm rounded-lg p-4">
      <div className="text-center space-y-2">
        <Key className="h-8 w-8 mx-auto text-[#F05023]" />
        <h2 className="text-lg font-semibold">Crear Nueva Contraseña</h2>
        <p className="text-sm text-gray-600">
          Ingresa el código de recuperación y tu nueva contraseña
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <Label htmlFor="resetCode">Código de Recuperación</Label>
          <Input
            id="resetCode"
            type="text"
            placeholder="123456"
            value={resetCode}
            onChange={(e) => setResetCode(e.target.value)}
            disabled={isLoading}
            required
            maxLength={6}
          />
        </div>

        <div>
          <Label htmlFor="newPassword">Nueva Contraseña</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isLoading}
            required
            minLength={6}
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
            minLength={6}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Actualizando...
            </>
          ) : (
            "Actualizar Contraseña"
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setStep("request")}
          disabled={isLoading}
        >
          Volver
        </Button>
      </form>
    </div>
  );
}
