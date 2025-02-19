import { PhonePreview } from "@/components/ui/phone-preview"
import { Home, Search, User } from "lucide-react"

export default function PreviewPage() {
  return (
    <PhonePreview>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-primary px-4 py-3 shadow-sm">
          <img 
            src="/Logo de Virtual agent logo largo_upscayl_2x_realesrgan-x4plus.png" 
            alt="Virtual Agent Logo"
            className="w-36 mx-auto"
          />
          <p className="text-white text-center text-xs mt-1">TU LLAVE DE INGRESO A LOS BIENES RAICES</p>
        </header>

        {/* Main content */}
        <main className="flex-1 px-3 py-4">
          {/* Action Button */}
          <button className="btn-primary w-full text-sm py-3 mb-4 shadow-sm">
            Nueva Propiedad
          </button>

          {/* Property Cards */}
          <div className="space-y-3">
            <div className="card bg-white">
              <h3 className="text-base font-semibold mb-2">Property Details</h3>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Location: Example Street</p>
                <p className="text-sm text-gray-600">Price: $250,000</p>
              </div>
              <button className="btn-primary w-full mt-3 text-sm py-2">
                View Details
              </button>
            </div>
          </div>
        </main>

        {/* Navigation Footer */}
        <footer className="sticky bottom-0 bg-white border-t border-gray-200 px-2 py-3">
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
  )
}