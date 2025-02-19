import { PhonePreview } from "@/components/ui/phone-preview"

export default function PreviewPage() {
  return (
    <PhonePreview>
      <div className="flex flex-col min-h-full">
        {/* Header with logo */}
        <header className="p-4 bg-primary">
          <img 
            src="/Logo de Virtual agent logo largo_upscayl_2x_realesrgan-x4plus.png" 
            alt="Virtual Agent Logo"
            className="w-full max-w-[200px] mx-auto"
          />
        </header>
        
        {/* Main content */}
        <main className="flex-1 p-4">
          <button className="btn-primary w-full mb-4">
            Nueva Propiedad
          </button>
          
          {/* Property form example */}
          <div className="card mb-4">
            <h2 className="text-lg font-semibold mb-4">Ingrese los datos</h2>
            <input 
              type="text" 
              placeholder="Nombre"
              className="input-field w-full mb-3"
            />
            <input 
              type="tel" 
              placeholder="Telefono"
              className="input-field w-full mb-3"
            />
            <input 
              type="email" 
              placeholder="Correo"
              className="input-field w-full mb-3"
            />
          </div>
        </main>
      </div>
    </PhonePreview>
  )
}
