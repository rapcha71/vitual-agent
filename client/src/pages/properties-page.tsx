import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { ArrowLeft, Plus, Loader2, Image } from "lucide-react";
import type { Property } from "@shared/schema";

export default function PropertiesPage() {
  const { user } = useAuth();

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    enabled: !!user,
  });



  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex flex-col h-screen">
          <header className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Tus Propiedades</h1>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <h1 className="text-xl font-bold">
                Mis Propiedades
              </h1>

              <Card>
                <CardContent className="p-6">
                  {isLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="mt-2">Cargando propiedades...</p>
                    </div>
                  ) : properties.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No tienes propiedades registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {properties.map((property) => (
                        <Card key={property.propertyId} className="p-4">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Información de la propiedad */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  property.operationType === 'Venta' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {property.operationType || 'Sin definir'}
                                </span>
                                <h3 className="font-semibold text-lg">
                                  {property.propertyType === 'house' ? 'Casa' : 
                                   property.propertyType === 'land' ? 'Terreno' : 
                                   'Local Comercial'}
                                </h3>
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p><span className="font-medium">ID:</span> {property.propertyId}</p>
                                <p><span className="font-medium">Contacto:</span> {property.signPhoneNumber || 'No disponible'}</p>
                                <p><span className="font-medium">Ubicación:</span> {property.location?.address || 'Sin dirección específica'}</p>
                                <p><span className="font-medium">Imágenes:</span> {property.images ? `${property.images.length} fotos` : 'Sin fotos'}</p>
                              </div>
                            </div>

                            {/* Fotos - Diseño responsivo */}
                            <div className="flex gap-4 justify-center lg:justify-end">
                              {property.images && property.images.length > 0 && (
                                <>
                                  {/* Foto de la propiedad - Siempre visible */}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <div className="relative group cursor-pointer">
                                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200">
                                          <img
                                            src={property.images[1] || property.images[0]}
                                            alt="Foto de la propiedad"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                          />
                                        </div>
                                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-white/90 text-gray-800 text-xs px-2 py-1 rounded shadow-md font-medium">
                                          Propiedad
                                        </div>
                                      </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Foto de la Propiedad</DialogTitle>
                                      </DialogHeader>
                                      <div className="py-4">
                                        <img
                                          src={property.images[1] || property.images[0]}
                                          alt="Foto de la propiedad"
                                          className="w-full h-auto rounded-lg"
                                        />
                                      </div>
                                    </DialogContent>
                                  </Dialog>

                                  {/* Foto del rótulo - Ahora visible en móvil también */}
                                  {property.images[0] && (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <div className="relative group cursor-pointer">
                                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200">
                                            <img
                                              src={property.images[0]}
                                              alt="Foto del rótulo"
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                            />
                                          </div>
                                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-white/90 text-gray-800 text-xs px-2 py-1 rounded shadow-md font-medium">
                                            Rótulo
                                          </div>
                                        </div>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                          <DialogTitle>Foto del Rótulo</DialogTitle>
                                        </DialogHeader>
                                        <div className="py-4">
                                          <img
                                            src={property.images[0]}
                                            alt="Foto del rótulo"
                                            className="w-full h-auto rounded-lg"
                                          />
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                  )}
                                </>
                              )}

                              {/* Placeholder si no hay imágenes */}
                              {(!property.images || property.images.length === 0) && (
                                <div className="flex gap-4">
                                  <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-lg border border-gray-300 bg-gray-100 flex items-center justify-center">
                                    <Image className="h-8 w-8 text-gray-400" />
                                  </div>
                                  <div className="w-24 h-24 rounded-lg border border-gray-300 bg-gray-100 items-center justify-center hidden lg:flex">
                                    <Image className="h-8 w-8 text-gray-400" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}