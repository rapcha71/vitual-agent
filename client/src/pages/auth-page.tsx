import { useState } from "react";
import { PhonePreview } from "@/components/ui/phone-preview";
import { Button } from "@/components/ui/button";
import { PasswordReset } from "@/components/ui/password-reset";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, registerFormSchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Redirect, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { PWAInstallButton } from "@/components/ui/pwa-install-button"; // Import PWAInstallButton

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true })),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  const [rememberMe, setRememberMe] = useState(true);

  const registerForm = useForm({
    resolver: zodResolver(registerFormSchema),
    mode: "onChange", // Revalida al escribir para que desaparezca el naranja
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      mobile: "",
      paymentMobile: "",
      nickname: "",
    },
  });

  const handleLogin = async (data: any) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await loginMutation.mutateAsync({ ...data, rememberMe });
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Error de inicio de sesión",
        description: error.message || "Por favor verifica tus credenciales",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (data: any) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await registerMutation.mutateAsync(data);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Error de registro",
        description: error.message || "No se pudo completar el registro",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterValidationError = () => {
    toast({
      title: "Campos incompletos",
      description: "Por favor, completa todos los espacios para poder registrarte",
      variant: "destructive",
    });
  };

  if (user) {
    return <Redirect to="/" />;
  }

  const isLoading = isSubmitting || loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="full-screen-layout bg-gray-100">
        <div className="flex flex-col h-full bg-white overflow-hidden">
          <header className="page-header">
            <div className="flex flex-col items-center content-wrapper">
              <img 
                src="/assets/logo-full.png"
                alt="Virtual Agent - Tu llave de ingreso a los bienes raíces"
                className="h-[96px] md:h-[160px] w-auto object-contain header-logo-2x" style={{ maxWidth: 'none' }}
              />
            </div>
            {/* Add PWA Install Button */}
            <div className="absolute top-4 right-4">
              <PWAInstallButton />
            </div>
          </header>

          <div className="flex-1 bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url("/assets/ciudad-optimized.webp")'}}>
            <div className="min-h-full p-4 content-wrapper max-w-2xl mx-auto">
              {showPasswordReset ? (
                <PasswordReset onBackToLogin={() => setShowPasswordReset(false)} />
              ) : (
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4 bg-white/80 backdrop-blur-sm">
                    <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                    <TabsTrigger value="register">Registrarse</TabsTrigger>
                  </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form 
                      onSubmit={loginForm.handleSubmit(handleLogin)} 
                      className="space-y-4 bg-white/95 backdrop-blur-sm rounded-lg p-4"
                      aria-label="Iniciar sesión"
                      noValidate
                    >
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="Ingrese su correo electrónico" 
                                autoComplete="username"
                                {...field} 
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Ingrese su contraseña" 
                                autoComplete="current-password"
                                {...field} 
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="rememberMe"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
className="h-4 w-4 rounded border-gray-300 text-[#F05023] focus:ring-2 focus:ring-[#F05023] focus:ring-offset-2"                        />
                        <label htmlFor="rememberMe" className="text-sm text-gray-700 cursor-pointer">
                          Recordarme en este dispositivo
                        </label>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Iniciando sesión...
                          </>
                        ) : (
                          "Iniciar Sesión"
                        )}
                      </Button>

                      <div className="text-center mt-4">
                        <button
                          type="button"
                          className="text-sm text-[#F05023] hover:text-[#E04015] hover:underline transition-colors"
                          onClick={() => setShowPasswordReset(true)}
                          disabled={isLoading}
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form 
                      onSubmit={registerForm.handleSubmit(handleRegister, handleRegisterValidationError)} 
                      className="space-y-4 bg-white/95 backdrop-blur-sm rounded-lg p-4"
                      aria-label="Registrarse"
                      noValidate
                    >
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>Nombre Completo</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ingrese su nombre completo" 
                                autoComplete="name"
                                {...field} 
                                disabled={isLoading}
                                className={cn(
                                  fieldState.error && "border-orange-500 bg-orange-50/50 focus-visible:ring-orange-500 focus-visible:border-orange-500"
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>Correo</FormLabel>
                            <FormControl>
                              <Input 
                                type="email"
                                placeholder="Ingrese su correo electrónico"
                                autoComplete="email"
                                {...field} 
                                disabled={isLoading}
                                className={cn(
                                  fieldState.error && "border-orange-500 bg-orange-50/50 focus-visible:ring-orange-500 focus-visible:border-orange-500"
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="mobile"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel"
                                placeholder="Ingrese su número de teléfono" 
                                autoComplete="tel"
                                {...field} 
                                disabled={isLoading}
                                className={cn(
                                  fieldState.error && "border-orange-500 bg-orange-50/50 focus-visible:ring-orange-500 focus-visible:border-orange-500"
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="paymentMobile"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>Teléfono para transferencias SINPE</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel"
                                placeholder="Número para recibir pagos vía SINPE" 
                                autoComplete="tel"
                                {...field} 
                                disabled={isLoading}
                                className={cn(
                                  fieldState.error && "border-orange-500 bg-orange-50/50 focus-visible:ring-orange-500 focus-visible:border-orange-500"
                                )}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground mt-1">
                              Se utilizará este número para hacer las transferencias a través de SINPE
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="nickname"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>Alias</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ingrese su alias" 
                                autoComplete="username"
                                {...field} 
                                disabled={isLoading}
                                className={cn(
                                  fieldState.error && "border-orange-500 bg-orange-50/50 focus-visible:ring-orange-500 focus-visible:border-orange-500"
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Ingrese su contraseña" 
                                autoComplete="new-password"
                                {...field} 
                                disabled={isLoading}
                                className={cn(
                                  fieldState.error && "border-orange-500 bg-orange-50/50 focus-visible:ring-orange-500 focus-visible:border-orange-500"
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {Object.keys(registerForm.formState.errors).length > 0 && (
                        <div
                          role="alert"
                          className="flex items-center gap-2 rounded-lg border border-orange-500 bg-orange-50/80 px-3 py-2 text-sm text-orange-800"
                        >
                          <span>Por favor, completa todos los espacios para poder registrarte.</span>
                        </div>
                      )}

                      <div className="text-sm text-gray-600 bg-white/95 backdrop-blur-sm p-3 rounded-lg space-y-2">
                        <p>
                          Recuerda que los pagos se realizan a traves de simpe movil por lo que el numero debera de estar conectado a una cuenta bancaria simpe.
                        </p>
                        <p>
                          Crea un alias de como quieres que te conozcan dentro de la comunidad.
                        </p>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registrando...
                          </>
                        ) : (
                          "Registrarse"
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}