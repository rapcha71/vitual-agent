
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SuccessCheck } from "@/components/ui/success-check";

export default function PropertyConfirmation() {
  const [location, setLocation] = useLocation();
  const { logoutMutation } = useAuth();

  // Get the propertyId from the URL path parameter
  const propertyId = location.split('/').pop();

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
              className="h-14 w-auto max-w-[60vw] object-contain header-logo-2x"
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

      <main className="page-content bg-cover bg-center bg-no-repeat content-wrapper" style={{backgroundImage: 'url("/assets/ciudad-optimized.webp")'}}>
        <div className="flex flex-col items-center justify-center min-h-full">
          <div className="text-center bg-white/90 backdrop-blur-sm p-8 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              ¡Propiedad agregada exitosamente!
            </h2>

            <div className="mt-8">
              <p className="text-lg font-medium text-gray-700">El ID de tu propiedad es:</p>
              <p className="text-2xl font-bold mt-2 text-[#F05023] break-all">
                {propertyId}
              </p>
            </div>

            <div className="mt-6">
              <SuccessCheck />
            </div>

            <div className="mt-8">
              <button
                onClick={() => setLocation("/")}
                className="w-full bg-[#F05023] text-white py-3 rounded-md font-semibold hover:bg-[#E04015] transition-colors"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
