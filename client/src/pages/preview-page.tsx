import { PhonePreview } from "@/components/ui/phone-preview"
import { Home, Search, User } from "lucide-react"

export default function PreviewPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <PhonePreview>
        <div className="flex flex-col">
          {/* Header with logo */}
          <header className="bg-primary px-4 py-3">
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

          {/* Form Fields Area - matching image 2.jpg */}
          <div className="p-4 bg-white flex-1">
            <div className="space-y-4">
              <div>
                <label className="text-black text-lg">Nombre:</label>
                <div className="border-b-2 border-gray-300 mt-1"></div>
              </div>
              <div>
                <label className="text-black text-lg">Telefono:</label>
                <div className="border-b-2 border-gray-300 mt-1"></div>
              </div>
              <div>
                <label className="text-black text-lg">Correo:</label>
                <div className="border-b-2 border-gray-300 mt-1"></div>
              </div>
              <div>
                <label className="text-black text-lg">Alias:</label>
                <div className="border-b-2 border-gray-300 mt-1"></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Recuerda que los pagos se realizan a traves de simpe movil por lo que el numero debera de estar conectado a una cuenta bancaria simpe.
              </p>
            </div>
          </div>

          {/* Navigation Footer */}
          <footer className="bg-white border-t border-gray-200 px-2 py-3">
            <nav className="flex justify-around items-center">
              <button className="flex flex-col items-center space-y-1">
                <Home className="h-5 w-5" />
                <span className="text-xs">Home</span>
              </button>
              <button className="flex flex-col items-center space-y-1">
                <Search className="h-5 w-5" />
                <span className="text-xs">Search</span>
              </button>
              <button className="flex flex-col items-center space-y-1">
                <User className="h-5 w-5" />
                <span className="text-xs">Profile</span>
              </button>
            </nav>
          </footer>
        </div>
      </PhonePreview>
    </div>
  )
}