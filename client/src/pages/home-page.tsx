import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Building2, Plus, LogOut, Home, MapPin, Building, ChevronLeft, Book, User, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PhonePreview } from "@/components/ui/phone-preview";
import { RegulationsDialog } from "@/components/ui/regulations-dialog";
import { useMemo } from "react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Optimized query with proper configuration
  const { data: properties = [], isLoading, error } = useQuery({
    queryKey: ['/api/properties'],
    staleTime: 60000, // Cache for 1 minute
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Memoized property counts to prevent unnecessary recalculations
  const propertyCounts = useMemo(() => ({
    house: properties.filter(p => p.propertyType === 'house').length,
    land: properties.filter(p => p.propertyType === 'land').length,
    commercial: properties.filter(p => p.propertyType === 'commercial').length
  }), [properties]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <PhonePreview>
          <header className="bg-[#F05023] px-4 py-3">
            <div className="flex items-center justify-center">
              <img 
                src="/assets/logo.png"
                alt="Virtual Agent"
                className="h-10 w-auto"
              />
            </div>
          </header>
          <div className="flex items-center justify-center h-[80vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F05023]"></div>
          </div>
        </PhonePreview>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <PhonePreview>
          <header className="bg-[#F05023] px-4 py-3">
            <div className="flex items-center justify-center">
              <img 
                src="/assets/logo.png"
                alt="Virtual Agent"
                className="h-10 w-auto"
              />
            </div>
          </header>
          <div className="p-4 text-center">
            <p className="text-red-600 mb-4">Error al cargar los datos.</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
            >
              Recargar página
            </Button>
          </div>
        </PhonePreview>
      </div>
    );
  }

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
                  <Link href="/admin">
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
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Propiedades
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline" className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  Perfil
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                  <Building className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>

            {/* Property Statistics */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-white/90 backdrop-blur-sm shadow-sm">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Casas
                    <Home className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-2xl font-bold">{propertyCounts.house}</div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm shadow-sm">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Terrenos
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-2xl font-bold">{propertyCounts.land}</div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm shadow-sm">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Comercial
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="text-2xl font-bold">{propertyCounts.commercial}</div>
                </CardContent>
              </Card>
            </div>

            {/* Properties List */}
            {properties.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm">
                  Tus Propiedades
                </h2>
                <div className="space-y-3">
                  {properties.map((property) => (
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