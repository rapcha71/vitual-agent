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
          <p className="text-white text-center text-sm mt-1">TU LLAVE DE INGRESO A LOS BIENES RAICES</p>
        </header>

        {/* Main content */}
        <main className="flex-1">
          {/* Registration Form */}
          <div className="p-4 bg-white">
            <form className="space-y-4">
              <div>
                <label className="text-black">Nombre:</label>
                <input 
                  type="text" 
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="text-black">Telefono:</label>
                <input 
                  type="tel" 
                  className="input-field w-full"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Recuerda que los pagos se realizan a traves de simpe movil por lo que el numero debera de estar conectado a una cuenta bancaria simpe.
                </p>
              </div>
              <div>
                <label className="text-black">Correo:</label>
                <input 
                  type="email" 
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="text-black">Alias:</label>
                <input 
                  type="text" 
                  className="input-field w-full"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Crea un alias de como quieres que te conozcan dentro de la comunidad.
                </p>
              </div>
            </form>
          </div>

          {/* Property Section */}
          <div className="p-4 bg-white mt-4">
            <button className="btn-primary w-full mb-4">
              Nueva Propiedad
            </button>

            {/* Map Section */}
            <div className="mb-4">
              <div className="bg-gray-100 h-48 rounded-lg mb-2">
                {/* Map will be integrated here */}
              </div>
              <button className="btn-primary w-full">
                Añade la ubicacion
              </button>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Recuerda siempre pararte en el frente y en el centro de la propiedad para ubicarla correctamente.
              </p>
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-2">
              <button className="btn-primary w-full">
                Foto 1
              </button>
              <button className="btn-primary w-full">
                Foto 2
              </button>
            </div>

            {/* Property Phone */}
            <div className="mt-4">
              <label className="text-black block mb-2">Telefono de la Propiedad:</label>
              <input 
                type="tel" 
                className="input-field w-full"
              />
            </div>
          </div>
        </main>
      </div>
    </PhonePreview>
  )
}