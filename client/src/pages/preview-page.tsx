import { PhonePreview } from "@/components/ui/phone-preview"

export default function PreviewPage() {
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

        {/* Form Fields Area - matching image 2.jpg */}
        <div className="p-4 bg-white">
          <div className="space-y-6">
            <div>
              <label className="text-black text-lg block">Nombre:</label>
              <div className="h-[2px] bg-gray-300 mt-2"></div>
            </div>

            <div>
              <label className="text-black text-lg block">Telefono:</label>
              <div className="h-[2px] bg-gray-300 mt-2"></div>
            </div>

            <div>
              <label className="text-black text-lg block">Correo:</label>
              <div className="h-[2px] bg-gray-300 mt-2"></div>
            </div>

            <div>
              <label className="text-black text-lg block">Alias:</label>
              <div className="h-[2px] bg-gray-300 mt-2"></div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Recuerda que los pagos se realizan a traves de simpe movil por lo que el numero debera de estar conectado a una cuenta bancaria simpe.
              </p>
            </div>

            <div className="mt-2 text-sm text-gray-600">
              <p>Crea un alias de como quieres que te conozcan dentro de la comunidad.</p>
            </div>
          </div>
        </div>
        {/* Navigation Footer - from original code */}
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
      </PhonePreview>
    </div>
  )
}