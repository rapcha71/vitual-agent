import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut } from "lucide-react";
import { useLocation } from "wouter";

export default function PreviewPage() {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="full-screen-layout bg-gray-100">
      <header className="page-header">
        <div className="flex items-center justify-between content-wrapper">
          <Button
            variant="ghost"
            className="text-white hover:text-white/80 p-0"
            onClick={() => setLocation("/")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <img
              src="/assets/logo-full.png"
              alt="Virtual Agent"
              className="h-14 w-auto max-w-[60vw] object-contain"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:text-white/80 p-0"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="page-content bg-cover bg-center bg-no-repeat content-wrapper" style={{backgroundImage: 'url("/assets/ciudad.jpeg")'}}>
        <div className="flex flex-col items-center justify-center min-h-full">
          <div className="text-center bg-white/90 backdrop-blur-sm p-8 rounded-lg max-w-2xl w-full mx-4">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">
              Vista Previa de la Aplicación
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Esta es una vista previa completa de Virtual Agent, optimizada para todos los dispositivos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <h3 className="font-semibold text-lg mb-2">Propiedades</h3>
                <p className="text-sm text-gray-600">Gestiona todas tus propiedades registradas</p>
              </div>
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <h3 className="font-semibold text-lg mb-2">Dashboard</h3>
                <p className="text-sm text-gray-600">Panel de control y estadísticas</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}