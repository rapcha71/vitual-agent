import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PropertyWithUser } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Image, MapPin, Menu } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useToast } from "@/hooks/use-toast";

const getMarkerColor = (propertyType: string) => {
  switch (propertyType) {
    case 'house':
      return '#F05023';
    case 'land':
      return '#22C55E';
    case 'commercial':
      return '#3B82F6';
    default:
      return '#F05023';
  }
};

export default function AdminWebPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [mapLoading, setMapLoading] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("map");
  const mapInitializedRef = useRef(false);

  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    enabled: user?.isAdmin === true
  });

  // Si el usuario no es administrador, redirigir
  if (!user?.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  useEffect(() => {
    const initMap = async () => {
      if (!mapContainerRef.current || !properties.length || mapInitializedRef.current) {
        return;
      }

      try {
        setMapLoading(true);

        if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
          throw new Error('Google Maps API key is missing');
        }

        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          version: "weekly",
          libraries: ["places"]
        });

        const google = await loader.load();

        if (!mapContainerRef.current) return;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: 9.9281, lng: -84.0907 },
          zoom: 8,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;
        mapInitializedRef.current = true;

        // Add markers
        properties.forEach(property => {
          const marker = new google.maps.Marker({
            position: {
              lat: property.location.lat,
              lng: property.location.lng
            },
            map,
            title: `${property.propertyType} - ${property.propertyId}`,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: getMarkerColor(property.propertyType),
              fillOpacity: 0.8,
              strokeWeight: 1,
              scale: 8
            }
          });

          markersRef.current.push(marker);

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
            infoWindow.open(map, marker);
          });
        });

      } catch (error) {
        console.error('Error initializing map:', error);
        toast({
          title: "Error al cargar el mapa",
          description: "Por favor, intente nuevamente.",
          variant: "destructive"
        });
      } finally {
        setMapLoading(false);
      }
    };

    if (activeTab === "map" && !mapInitializedRef.current) {
      initMap();
    }

    return () => {
      if (mapRef.current) {
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        mapInitializedRef.current = false;
      }
    };
  }, [activeTab, properties, toast]);

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
                {activeTab === "map" && (
                  <div
                    ref={mapContainerRef}
                    className="w-full h-[600px] rounded-lg relative bg-gray-50"
                  >
                    {mapLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10 rounded-lg">
                        <div className="text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                          <p className="text-sm text-muted-foreground">Cargando mapa...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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