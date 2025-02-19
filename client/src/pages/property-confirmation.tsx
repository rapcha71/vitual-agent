import { PhonePreview } from "@/components/ui/phone-preview";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function PropertyConfirmation() {
  const [, setLocation] = useLocation();
  const { logoutMutation } = useAuth();

  // Get the latest property from the query parameters
  const propertyId = new URLSearchParams(window.location.search).get('id');

  return (
    <div className="flex items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat" 
         style={{
           backgroundImage: 'url("/assets/ciudad.jpeg")',
           backgroundColor: 'rgba(0, 0, 0, 0.5)',
           backgroundBlend: 'overlay'
         }}>
      <PhonePreview>
        <header className="bg-[#F05023] px-4 py-3">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              className="text-white hover:text-white/80 p-0"
              onClick={() => setLocation("/")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <img 
                src="/assets/logo.png"
                alt="Virtual Agent"
                className="h-10 w-auto"
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

        <div className="p-4 bg-white flex-1">
          <div className="flex flex-col items-center justify-center space-y-6 mt-8">
            <div className="bg-white shadow-lg rounded-lg p-6 text-center w-full max-w-sm">
              <div className="mb-4">
                <p className="text-xl font-semibold text-[#F05023]">
                  ¡Felicidades! Tu propiedad ha sido registrada con éxito
                </p>
              </div>

              <div className="mt-8">
                <p className="text-lg font-medium">El ID de tu propiedad es:</p>
                <p className="text-2xl font-bold mt-2 text-[#F05023] break-all">
                  {propertyId}
                </p>
              </div>

              <div className="mt-6">
                <img 
                  src="/emoji-success.png" 
                  alt="Success"
                  className="w-24 h-24 mx-auto"
                />
              </div>
            </div>

            <div className="w-full space-y-4">
              <button
                onClick={() => setLocation("/")}
                className="w-full bg-[#F05023] text-white py-3 rounded-md font-semibold"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      </PhonePreview>
    </div>
  );
}