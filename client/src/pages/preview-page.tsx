import { PhonePreview } from "@/components/ui/phone-preview"

export default function PreviewPage() {
  return (
    <PhonePreview>
      <div className="flex flex-col min-h-full">
        {/* Header */}
        <header className="p-4 bg-primary">
          <img 
            src="/Logo de Virtual agent logo largo_upscayl_2x_realesrgan-x4plus.png" 
            alt="Virtual Agent Logo"
            className="w-full max-w-[200px] mx-auto"
          />
          <p className="text-white text-center text-sm mt-1">TU LLAVE DE INGRESO A LOS BIENES RAICES</p>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4">
          {/* Property Actions */}
          <button className="btn-primary w-full mb-4">
            Nueva Propiedad
          </button>

          {/* Property List or Details */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="text-lg font-semibold mb-2">Property Details</h3>
              <p className="text-sm text-gray-600">Location: Example Street</p>
              <p className="text-sm text-gray-600">Price: $250,000</p>
              <div className="mt-2">
                <button className="btn-primary w-full">View Details</button>
              </div>
            </div>

            {/* Add more property cards here */}
          </div>
        </main>

        {/* Navigation Footer */}
        <footer className="mt-auto p-4 bg-white border-t">
          <nav className="flex justify-around">
            <button className="nav-link">Home</button>
            <button className="nav-link">Search</button>
            <button className="nav-link">Profile</button>
          </nav>
        </footer>
      </div>
    </PhonePreview>
  )
}