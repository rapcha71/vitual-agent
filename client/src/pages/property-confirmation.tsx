import { PhonePreview } from "@/components/ui/phone-preview";
import { useLocation } from "wouter";

export default function PropertyConfirmation() {
  const [, setLocation] = useLocation();

  const handleCloseApp = () => {
    window.close();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <PhonePreview>
        {/* Header with logo */}
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

        <div className="p-4 bg-white flex-1">
          <div className="flex flex-col items-center justify-center space-y-6 mt-8">
            <div className="bg-white shadow-lg rounded-lg p-6 text-center">
              <div className="mb-4">
                <p className="text-xl font-semibold text-[#FF5733]">
                  Felicidades has ingresado una nueva propiedad con exito!
                </p>
              </div>

              <div className="mt-8">
                <p className="text-lg font-medium">El ID de tu propiedad es:</p>
                <p className="text-3xl font-bold mt-2 text-[#FF5733]">193407</p>
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
                className="w-full bg-[#FF5733] text-white py-3 rounded-md font-semibold"
              >
                Volver al Inicio
              </button>

              <button
                onClick={handleCloseApp}
                className="w-full bg-gray-600 text-white py-3 rounded-md font-semibold hover:bg-gray-700 transition-colors"
              >
                Cerrar Aplicación
              </button>
            </div>
          </div>
        </div>
      </PhonePreview>
    </div>
  );
}