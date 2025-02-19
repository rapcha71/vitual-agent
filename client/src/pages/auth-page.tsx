import { useState } from "react";
import { PhonePreview } from "@/components/ui/phone-preview";
import { Button } from "@/components/ui/button";
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
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema.pick({ username: true, password: true })),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      mobile: "",
      nickname: "",
    },
  });

  const handleLogin = async (data: any) => {
    try {
      console.log("Iniciando proceso de login", data);
      await loginMutation.mutateAsync(data);
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido de vuelta",
      });
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Error de inicio de sesión",
        description: error.message || "Por favor verifica tus credenciales",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (data: any) => {
    try {
      console.log("Iniciando proceso de registro", data);
      await registerMutation.mutateAsync(data);
      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada correctamente",
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Error de registro",
        description: error.message || "No se pudo completar el registro",
        variant: "destructive",
      });
    }
  };

  if (user) {
    console.log("Usuario autenticado, redirigiendo a home");
    return <Redirect to="/" />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <PhonePreview>
        <header className="bg-[#F05023] px-4 py-3">
          <div className="flex flex-col items-center">
            <img 
              src="/assets/logo.png"
              alt="Virtual Agent"
              className="h-10 w-auto"
            />
            <div className="text-white text-xs mt-1">
              TU LLAVE DE INGRESO A LOS BIENES RAICES
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url("/assets/ciudad.jpeg")'}}>
          <div className="p-4">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-white/80 backdrop-blur-sm">
                <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register">Registrarse</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form 
                    onSubmit={loginForm.handleSubmit(handleLogin)} 
                    className="space-y-4 bg-white/90 backdrop-blur-sm rounded-lg p-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingrese su correo electrónico" {...field} />
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
                            <Input type="password" placeholder="Ingrese su contraseña" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full bg-[#F05023] hover:bg-[#F05023]/90"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form 
                    onSubmit={registerForm.handleSubmit(handleRegister)} 
                    className="space-y-4 bg-white/90 backdrop-blur-sm rounded-lg p-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingrese su nombre completo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingrese su correo electrónico" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingrese su número de teléfono" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="nickname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alias</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingrese su alias" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Ingrese su contraseña" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="text-sm text-gray-600 bg-white/80 backdrop-blur-sm p-3 rounded-lg space-y-2">
                      <p>
                        Recuerda que los pagos se realizan a traves de simpe movil por lo que el numero debera de estar conectado a una cuenta bancaria simpe.
                      </p>
                      <p>
                        Crea un alias de como quieres que te conozcan dentro de la comunidad.
                      </p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-[#F05023] hover:bg-[#F05023]/90"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Registrando..." : "Registrarse"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </PhonePreview>
    </div>
  );
}