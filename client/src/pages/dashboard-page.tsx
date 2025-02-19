import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Plus, Shield, Book, MapPin } from "lucide-react";
import { useLocation } from "wouter";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Count properties by type
  const propertyCounts = {
    house: properties.filter(p => p.propertyType === 'house').length,
    land: properties.filter(p => p.propertyType === 'land').length,
    commercial: properties.filter(p => p.propertyType === 'commercial').length,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#F05023] px-4 py-3 flex items-center justify-between">
        <Button 
          variant="ghost" 
          className="text-white hover:text-white/80 p-0"
          onClick={() => setLocation("/")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <img 
            src="/assets/logo.png"
            alt="Virtual Agent"
            className="h-10 w-auto"
          />
          {user?.isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLocation("/admin")}
              className="flex items-center gap-2 bg-white text-[#F05023] hover:bg-white/90"
            >
              <Shield className="h-4 w-4" />
              Panel de Administración
            </Button>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white hover:text-white/80 p-0"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Mi Panel</h1>
          <div className="flex gap-2">
            <Button onClick={() => setLocation("/property/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Propiedad
            </Button>
            <Button variant="outline" onClick={() => window.open('/reglamento.pdf', '_blank')}>
              <Book className="h-4 w-4 mr-2" />
              Ver Reglamento
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mis Propiedades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Casas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{propertyCounts.house}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Terrenos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{propertyCounts.land}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Propiedades Comerciales</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{propertyCounts.commercial}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Button 
          variant="default" 
          size="lg" 
          className="w-full"
          onClick={() => setLocation("/properties")}
        >
          <MapPin className="h-5 w-5 mr-2" />
          Ver Propiedades y Mapa
        </Button>
      </main>
    </div>
  );
}