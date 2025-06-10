import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Plus, LogOut, ChevronLeft, Shield, User, Building, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { RegulationsDialog } from "@/components/ui/regulations-dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const ITEMS_PER_PAGE = 5;

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const paginatedProperties = properties.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = properties.length > paginatedProperties.length;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="flex flex-col min-h-screen">
          <header className="bg-[#F05023] px-4 py-3 flex-none">
            <div className="flex items-center justify-center">
              <img 
                src="/assets/logo.png"
                alt="Virtual Agent"
                className="h-10 md:h-12 lg:h-14 w-auto"
                loading="eager"
              />
            </div>
            </header>
          <main className="flex-1 flex flex-col items-center justify-center p-4 bg-cover bg-center bg-fixed"
            style={{
              backgroundImage: 'url("/assets/ciudad.jpeg")',
            }}
          >
            <div className="max-w-sm w-full space-y-6 text-center backdrop-blur-sm bg-white/80 p-6 rounded-lg shadow-lg">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  ¡Bienvenido a Virtual Agent!
                </h1>
                <p className="text-gray-600">
                  Tu llave de ingreso a los bienes raíces
                </p>
              </div>
              <Link to="/auth">
                <Button className="w-full bg-[#F05023] hover:bg-[#e04419] text-white">
                  Iniciar Sesión
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex flex-col min-h-screen">
          <header className="bg-[#F05023] px-4 py-3 flex-none">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                className="text-white hover:text-white/80 p-0"
                onClick={() => window.history.back()}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center">
                <img 
                  src="/assets/logo.png"
                  alt="Virtual Agent"
                  className="h-14 md:h-16 lg:h-18 w-auto"
                  loading="eager"
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

          <main 
            className="flex-1 overflow-y-auto bg-cover bg-center bg-fixed"
            style={{
              backgroundImage: 'url("/assets/ciudad.jpeg")',
              minHeight: 'calc(100vh - 64px)'
            }}
          >
            <div className="min-h-full p-4 space-y-4 backdrop-blur-[2px]">
              {/* Welcome Section */}
              <div className="space-y-2 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-sm">
                <h1 className="text-xl font-bold">
                  Bienvenido, {user?.fullName || user?.nickname || user?.username}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Administra y rastrea tus propiedades en un solo lugar
                </p>
                <div className="flex flex-col gap-2">
                  <Link href="/property/new">
                    <Button className="w-full transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Propiedad
                    </Button>
                  </Link>
                  {user?.isAdmin && (
                    <Link href="/admin/web">
                      <Button variant="outline" className="w-full">
                        <Shield className="h-4 w-4 mr-2" />
                        Panel de Administración
                      </Button>
                    </Link>
                  )}
                  <RegulationsDialog />
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Link href="/properties">
                  <Button 
                    variant="outline" 
                    className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm bg-white/90 backdrop-blur-sm"
                  >
                    <Building className="h-4 w-4" />
                    <span>Propiedades</span>
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button 
                    variant="outline" 
                    className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm bg-white/90 backdrop-blur-sm"
                  >
                    <User className="h-4 w-4" />
                    <span>Perfil</span>
                  </Button>
                </Link>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard">
                  <Button 
                    variant="outline" 
                    className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm bg-white/90 backdrop-blur-sm"
                  >
                    <Building className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                <Link href="/share">
                  <Button 
                    variant="outline" 
                    className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-700"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Compartir App</span>
                  </Button>
                </Link>
              </div>

              {/* Properties List */}
              {isLoading ? (
                <div className="flex justify-center py-4 bg-white/90 backdrop-blur-sm rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : paginatedProperties.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm">
                    Tus Propiedades
                  </h2>
                  <div className="space-y-3">
                    {paginatedProperties.map((property) => (
                      <Card key={property.id} className="bg-white/90 backdrop-blur-sm shadow-sm">
                        <CardHeader className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              property.operationType === 'Venta' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {property.operationType || 'Sin definir'}
                            </span>
                          </div>
                          <CardTitle className="text-base">
                            {property.propertyType === 'house' ? 'Casa' : 
                             property.propertyType === 'land' ? 'Terreno' : 
                             'Local Comercial'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                            {/* Información de la propiedad */}
                            <div className="flex-1 space-y-2 text-sm">
                              <p className="text-muted-foreground">
                                ID: {property.propertyId}
                              </p>
                              {property.signPhoneNumber && (
                                <p className="text-muted-foreground">
                                  Contacto: {property.signPhoneNumber}
                                </p>
                              )}
                              <p className="text-muted-foreground">
                                Ubicación: {property.location && `${property.location.lat.toFixed(6)}, ${property.location.lng.toFixed(6)}`}
                              </p>
                            </div>

                            {/* Fotos de la propiedad */}
                            {property.images && property.images.length > 0 && (
                              <div className="flex gap-2 justify-center lg:justify-end">
                                {/* Foto de la propiedad */}
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shadow-sm border border-gray-200">
                                  <img
                                    src={property.images[1] || property.images[0]}
                                    alt="Foto de la propiedad"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                {/* Foto del rótulo */}
                                {property.images[0] && (
                                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shadow-sm border border-gray-200">
                                    <img
                                      src={property.images[0]}
                                      alt="Foto del rótulo"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {hasMore && (
                      <Button
                        variant="outline"
                        className="w-full mt-4 bg-white/90 backdrop-blur-sm"
                        onClick={() => setPage(p => p + 1)}
                      >
                        Cargar más propiedades
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
                  <p className="text-muted-foreground">No tienes propiedades registradas</p>
                </div>
              )}
            </div>
          </main>
        </div>
    </div>
  );
}