import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Plus, LogOut, ChevronLeft, Shield, User, Building } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PhonePreview } from "@/components/ui/phone-preview";
import { RegulationsDialog } from "@/components/ui/regulations-dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";

const ITEMS_PER_PAGE = 5;

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);

  // Optimizada la consulta con staleTime y cacheTime
  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    staleTime: 300000, // 5 minutos
    cacheTime: 600000, // 10 minutos
    refetchOnWindowFocus: false,
  });

  // Calcular propiedades para la página actual
  const paginatedProperties = properties.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = properties.length > paginatedProperties.length;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <PhonePreview>
        <header className="bg-[#F05023] px-4 py-3">
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
                className="h-10 w-auto"
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

        <div 
          className="p-4 space-y-6 overflow-y-auto bg-white"
          style={{
            backgroundImage: 'url("/assets/ciudad.jpeg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="space-y-4">
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
                  <Button className="w-full">
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
            <div className="grid grid-cols-3 gap-3">
              <Link href="/properties">
                <Button 
                  variant="outline" 
                  className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm"
                >
                  <Building className="h-4 w-4" />
                  <span>Propiedades</span>
                </Button>
              </Link>
              <Link href="/profile">
                <Button 
                  variant="outline" 
                  className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm"
                >
                  <User className="h-4 w-4" />
                  <span>Perfil</span>
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button 
                  variant="outline" 
                  className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm"
                >
                  <Building className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>
            </div>

            {/* Properties List with Pagination */}
            {isLoading ? (
              <div className="flex justify-center py-4">
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
                        <CardTitle className="text-base">
                          {property.propertyType === 'house' ? 'Casa' : 
                           property.propertyType === 'land' ? 'Terreno' : 
                           'Local Comercial'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="space-y-2 text-sm">
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
                      </CardContent>
                    </Card>
                  ))}
                  {hasMore && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
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
        </div>
      </PhonePreview>
    </div>
  );
}