import { useState } from "react";
import { PhonePreview } from "@/components/ui/phone-preview";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  const form = useForm({
    resolver: zodResolver(
      isLogin 
        ? insertUserSchema.pick({ username: true, password: true })
        : insertUserSchema
    ),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      mobile: "",
      nickname: ""
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const handleSubmit = (data: any) => {
    if (isLogin) {
      loginMutation.mutate({
        username: data.username,
        password: data.password
      });
    } else {
      registerMutation.mutate(data);
    }
  };

  return (
    <PhonePreview>
      <header className="bg-[#FF5733] px-4 py-3">
        <div className="flex flex-col items-center">
          <img 
            src="/attached_assets/Logo de Virtual agent logo largo_upscayl_2x_realesrgan-x4plus.png"
            alt="Virtual Agent"
            className="h-10 w-auto"
          />
          <div className="text-white text-xs mt-1">
            TU LLAVE DE INGRESO A LOS BIENES RAICES
          </div>
        </div>
      </header>

      <div className="p-4 bg-white">
        <div className="mb-6 flex justify-center space-x-4">
          <button
            onClick={() => setIsLogin(true)}
            className={`px-4 py-2 rounded-md transition-colors ${
              isLogin ? 'bg-[#FF5733] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`px-4 py-2 rounded-md transition-colors ${
              !isLogin ? 'bg-[#FF5733] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Registrarse
          </button>
        </div>

        <div className="space-y-6">
          {!isLogin && (
            <>
              <div>
                <label className="text-black text-lg block">Nombre:</label>
                <div className="h-[2px] bg-gray-300 mt-2"></div>
                <input
                  {...form.register("fullName")}
                  className="w-full bg-transparent border-none focus:outline-none"
                  placeholder="Ingrese su nombre completo"
                />
              </div>

              <div>
                <label className="text-black text-lg block">Telefono:</label>
                <div className="h-[2px] bg-gray-300 mt-2"></div>
                <input
                  {...form.register("mobile")}
                  className="w-full bg-transparent border-none focus:outline-none"
                  placeholder="Ingrese su número de teléfono"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-black text-lg block">Correo:</label>
            <div className="h-[2px] bg-gray-300 mt-2"></div>
            <input
              {...form.register("username")}
              className="w-full bg-transparent border-none focus:outline-none"
              placeholder="Ingrese su correo electrónico"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="text-black text-lg block">Alias:</label>
              <div className="h-[2px] bg-gray-300 mt-2"></div>
              <input
                {...form.register("nickname")}
                className="w-full bg-transparent border-none focus:outline-none"
                placeholder="Ingrese su alias"
              />
            </div>
          )}

          <div>
            <label className="text-black text-lg block">Contraseña:</label>
            <div className="h-[2px] bg-gray-300 mt-2"></div>
            <input
              {...form.register("password")}
              type="password"
              className="w-full bg-transparent border-none focus:outline-none"
              placeholder="Ingrese su contraseña"
            />
          </div>

          {!isLogin && (
            <>
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Recuerda que los pagos se realizan a traves de simpe movil por lo que el numero debera de estar conectado a una cuenta bancaria simpe.
                </p>
              </div>

              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  Crea un alias de como quieres que te conozcan dentro de la comunidad.
                </p>
              </div>
            </>
          )}

          <button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={loginMutation.isPending || registerMutation.isPending}
            className="w-full bg-[#FF5733] text-white py-3 rounded-md mt-4 font-semibold"
          >
            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </div>
      </div>
    </PhonePreview>
  );
}