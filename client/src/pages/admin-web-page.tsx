import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PropertyWithUser } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Image, MapPin, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef, memo } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useToast } from "@/hooks/use-toast";

const MapComponent = memo(({ properties }: { properties: PropertyWithUser[] }) => {
  const [isLoading, setIsLoading] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let isActive = true;

    const initializeMap = async () => {
      if (!mapContainer.current || !properties.length) {
        setIsLoading(false);
        return;
      }

      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
          version: "weekly",
          libraries: ["places"]
        });

        await loader.load();

        if (!isActive || !mapContainer.current) return;

        // Configuración específica para móvil
        const mapOptions: google.maps.MapOptions = {
          center: { lat: 9.9281, lng: -84.0907 },
          zoom: 7,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
          },
          gestureHandling: 'greedy',
          controlSize: 32,
          disableDefaultUI: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        };

        map.current = new google.maps.Map(mapContainer.current, mapOptions);

        // Limpiar marcadores existentes
        markers.current.forEach(marker => marker.setMap(null));
        markers.current = [];

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
              fillOpacity: 0.9,
              strokeWeight: 2,
              scale: 14
            }
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 16px; min-width: 200px; max-width: 280px;">
                <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: bold;">
                  Propiedad: ${property.propertyId}
                </h3>
                <p style="margin: 0 0 8px; font-size: 14px;">
                  Tipo: ${
                    property.propertyType === 'house' ? 'Casa' :
                    property.propertyType === 'land' ? 'Terreno' :
                    'Local Comercial'
                  }
                </p>
                <p style="margin: 8px 0; font-size: 14px;">
                  Teléfono: ${property.signPhoneNumber || 'No disponible'}
                </p>
              </div>
            `,
            maxWidth: 280,
            pixelOffset: new google.maps.Size(0, -20)
          });

          marker.addListener('click', () => {
            infoWindow.open(map.current, marker);
          });

          markers.current.push(marker);
        });

        // Ajustar bounds para mostrar todos los marcadores
        const bounds = new google.maps.LatLngBounds();
        markers.current.forEach(marker => {
          bounds.extend(marker.getPosition()!);
        });
        map.current.fitBounds(bounds, { padding: 50 });

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
      markers.current.forEach(marker => {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      });
      markers.current = [];
      if (map.current) {
        google.maps.event.clearInstanceListeners(map.current);
      }
    };
  }, [properties, toast]);

  return (
    <div 
      ref={mapContainer}
      className="w-screen h-[70vh] touch-pan-x touch-pan-y"
      style={{
        margin: '0 -1rem',
        maxHeight: '600px',
        minHeight: '300px'
      }}
    >
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
      {/* Header */}
      <header className="bg-[#F05023] px-4 py-3 flex items-center justify-between fixed top-0 w-full z-50">
        <Button 
          variant="ghost" 
          className="text-white hover:text-white/80 p-0"
          onClick={() => setLocation("/dashboard")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <img 
            src="/assets/logo.png"
            alt="Virtual Agent"
            className="h-8 w-auto"
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
      </header>

      {/* Main Content */}
      <main className="pt-16 px-4 space-y-4">
        <h1 className="text-xl font-bold">Panel de Administración</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Casas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{propertyCounts.house}</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Terrenos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{propertyCounts.land}</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comercial</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{propertyCounts.commercial}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-12">
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
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="hidden sm:table-cell">Usuario</TableHead>
                      <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                      <TableHead className="w-24">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.propertyId}>
                        <TableCell className="font-medium">{property.propertyId}</TableCell>
                        <TableCell>
                          {property.propertyType === 'house' ? 'Casa' :
                           property.propertyType === 'land' ? 'Terreno' :
                           'Comercial'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {property.user.fullName || property.user.username}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {property.signPhoneNumber || '-'}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full">
                                Detalles
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[90vw] max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Detalles de la Propiedad</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="sm:hidden">
                                  <p><strong>Usuario:</strong> {property.user.fullName || property.user.username}</p>
                                  <p><strong>Teléfono:</strong> {property.signPhoneNumber || '-'}</p>
                                </div>
                                <p><strong>Ubicación:</strong> {property.location.lat.toFixed(6)}, {property.location.lng.toFixed(6)}</p>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}