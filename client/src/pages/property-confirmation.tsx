
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
    <div className="min-h-screen bg-gray-100">
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

        <div className="p-4 bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url("/assets/ciudad.jpeg")'}}>
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
                <SuccessCheck />
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
    </div>
  );
}