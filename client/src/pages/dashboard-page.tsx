import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LogOut, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { PhonePreview } from "@/components/ui/phone-preview";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const propertyCounts = {
    house: properties.filter(p => p.propertyType === 'house').length,
    land: properties.filter(p => p.propertyType === 'land').length,
    commercial: properties.filter(p => p.propertyType === 'commercial').length,
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <PhonePreview>
        <header className="bg-[#F05023] px-4 py-3">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              className="text-white hover:text-white/80 p-0"
              onClick={() => setLocation("/")}
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

        <main className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Bienvenido, {user?.fullName}</h1>
            <Button onClick={() => setLocation("/property/new")}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Propiedad
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mis Propiedades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Casas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{propertyCounts.house}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Terrenos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{propertyCounts.land}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Comercial</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{propertyCounts.commercial}</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </main>
      </PhonePreview>
    </div>
  );
}