import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PropertyWithUser } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Image, MapPin, Menu } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef, memo } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useToast } from "@/hooks/use-toast";

// Separar el componente del mapa para evitar re-renders innecesarios
const MapComponent = memo(({ properties }: { properties: PropertyWithUser[] }) => {
  const [isLoading, setIsLoading] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let isActive = true;
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!googleMapsApiKey || !mapContainer.current || !properties.length) {
      setIsLoading(false);
      return;
    }

    const loader = new Loader({
      apiKey: googleMapsApiKey,
      version: "weekly",
      libraries: ["places"]
    });

    const initializeMap = async () => {
      try {
        await loader.load();

        if (!isActive || !mapContainer.current) return;

        if (!map.current) {
          map.current = new google.maps.Map(mapContainer.current, {
            center: { lat: 9.9281, lng: -84.0907 },
            zoom: 8,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
          });
        }

        // Limpiar marcadores existentes
        markers.current.forEach(marker => marker.setMap(null));
        markers.current = [];

        // Agregar nuevos marcadores
        properties.forEach(property => {
          const marker = new google.maps.Marker({
            position: {
              lat: property.location.lat,
              lng: property.location.lng
            },
            map: map.current,
            title: property.propertyId,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: property.propertyType === 'house' ? '#F05023' : 
                        property.propertyType === 'land' ? '#22C55E' : '#3B82F6',
              fillOpacity: 0.8,
              strokeWeight: 1,
              scale: 8
            }
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 10px">
                <h3 style="margin: 0 0 5px">Propiedad: ${property.propertyId}</h3>
                <p style="margin: 0">Tipo: ${
                  property.propertyType === 'house' ? 'Casa' :
                  property.propertyType === 'land' ? 'Terreno' :
                  'Local Comercial'
                }</p>
                <p style="margin: 5px 0">Teléfono: ${property.signPhoneNumber || 'No disponible'}</p>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map.current, marker);
          });

          markers.current.push(marker);
        });

      } catch (error) {
        console.error('Error loading map:', error);
        if (isActive) {
          toast({
            title: "Error al cargar el mapa",
            description: "Por favor, recarga la página",
            variant: "destructive"
          });
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    initializeMap();

    return () => {
      isActive = false;
      if (markers.current) {
        markers.current.forEach(marker => {
          google.maps.event.clearInstanceListeners(marker);
          marker.setMap(null);
        });
        markers.current = [];
      }
      if (map.current) {
        google.maps.event.clearInstanceListeners(map.current);
      }
    };
  }, [properties, toast]);

  return (
    <div className="relative w-full h-[600px] bg-gray-50 rounded-lg">
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%' }}
        className="rounded-lg"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Cargando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
});

MapComponent.displayName = 'MapComponent';

export default function AdminWebPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("map");

  const { data: properties = [] } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    enabled: user?.isAdmin === true
  });

  if (!user?.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  const propertyCounts = {
    house: properties.filter(p => p.propertyType === 'house').length,
    land: properties.filter(p => p.propertyType === 'land').length,
    commercial: properties.filter(p => p.propertyType === 'commercial').length,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-[#F05023] px-4 py-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="text-white hover:text-white/80 p-0"
            onClick={() => setLocation("/")}
          >
            <Menu className="h-5 w-5" />
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

      <div className="p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
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
              <CardTitle className="text-lg">Locales Comerciales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{propertyCounts.commercial}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="map" className="text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Mapa
                </TabsTrigger>
                <TabsTrigger value="list" className="text-sm">
                  <Image className="h-4 w-4 mr-2" />
                  Lista
                </TabsTrigger>
              </TabsList>

              <TabsContent value="map" className="mt-4">
                <MapComponent properties={properties} />
              </TabsContent>

              <TabsContent value="list">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties.map((property) => (
                        <TableRow key={property.propertyId}>
                          <TableCell>{property.propertyId}</TableCell>
                          <TableCell>
                            {property.propertyType === 'house' ? 'Casa' :
                             property.propertyType === 'land' ? 'Terreno' :
                             'Local Comercial'}
                          </TableCell>
                          <TableCell>{property.user.fullName || property.user.username}</TableCell>
                          <TableCell>{property.signPhoneNumber || '-'}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Ver Detalles
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}