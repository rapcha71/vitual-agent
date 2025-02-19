import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Building2, Plus, LogOut, Home, MapPin, Building, ChevronLeft, Book } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { PhonePreview } from "@/components/ui/phone-preview";
import { RegulationsDialog } from "@/components/ui/regulations-dialog";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  // Fetch user's properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Count properties by type
  const propertyCounts = {
    house: properties.filter(p => p.propertyType === 'house').length,
    land: properties.filter(p => p.propertyType === 'land').length,
    commercial: properties.filter(p => p.propertyType === 'commercial').length
  };

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

        <main className="p-4 space-y-6 bg-cover bg-center bg-no-repeat overflow-y-auto" style={{backgroundImage: 'url("/assets/ciudad.jpeg")'}}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* Welcome Section */}
            <div className="space-y-2 bg-white/90 backdrop-blur-sm p-4 rounded-lg">
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
                <RegulationsDialog />
              </div>
            </div>

            {/* Property Statistics */}
            <div className="space-y-3">
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Casas
                  </CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{propertyCounts.house}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Terrenos
                  </CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{propertyCounts.land}</div>
                </CardContent>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Propiedades Comerciales
                  </CardTitle>
                  <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{propertyCounts.commercial}</div>
                </CardContent>
              </Card>
            </div>

            {/* Properties List */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold bg-white/90 backdrop-blur-sm p-2 rounded-lg">
                Tus Propiedades
              </h2>
              <div className="space-y-3">
                {properties.map((property) => (
                  <Card key={property.id} className="bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-base">
                        {property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
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
          </motion.div>
        </main>
      </PhonePreview>
    </div>
  );
}