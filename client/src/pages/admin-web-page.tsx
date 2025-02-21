import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PropertyWithUser } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin, Image, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef, memo } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useToast } from "@/hooks/use-toast";

const MapComponent = memo(({ properties }: { properties: PropertyWithUser[] }) => {
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!mapRef.current || !properties.length) {
        setIsLoading(false);
        return;
      }

      try {
        if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
          console.error('Google Maps API key is missing');
          setIsLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          version: "weekly",
          libraries: ["places"]
        });

        await loader.load();

        if (!isMounted || !mapRef.current) return;

        const mapOptions: google.maps.MapOptions = {
          center: { lat: 9.9281, lng: -84.0907 },
          zoom: 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_TOP
          },
          gestureHandling: 'greedy',
          controlSize: 24,
          disableDefaultUI: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        };

        map.current = new google.maps.Map(mapRef.current, mapOptions);

        markers.current.forEach(marker => marker.setMap(null));
        markers.current = [];

        properties.forEach(property => {
          const marker = new google.maps.Marker({
            position: { lat: property.location.lat, lng: property.location.lng },
            map: map.current,
            title: property.propertyId,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: property.propertyType === 'house' ? '#F05023' :
                        property.propertyType === 'land' ? '#22C55E' : '#3B82F6',
              fillOpacity: 0.9,
              strokeWeight: 2,
              scale: 8
            }
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; min-width: 200px; max-width: 250px;">
                <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: bold;">
                  Propiedad: ${property.propertyId}
                </h3>
                <p style="margin: 0 0 6px; font-size: 12px;">
                  Tipo: ${
                    property.propertyType === 'house' ? 'Casa' :
                    property.propertyType === 'land' ? 'Terreno' :
                    'Local Comercial'
                  }
                </p>
                <p style="margin: 6px 0; font-size: 12px;">
                  Teléfono: ${property.signPhoneNumber || 'No disponible'}
                </p>
              </div>
            `,
            maxWidth: 250
          });

          marker.addListener('click', () => {
            infoWindow.open(map.current, marker);
          });

          markers.current.push(marker);
        });

        const bounds = new google.maps.LatLngBounds();
        markers.current.forEach(marker => {
          bounds.extend(marker.getPosition()!);
        });
        map.current.fitBounds(bounds, { padding: 40 });

        // Asegurar que el mapa se renderice correctamente
        setTimeout(() => {
          if (map.current) {
            google.maps.event.trigger(map.current, 'resize');
            map.current.fitBounds(bounds, { padding: 40 });
          }
        }, 100);

        setIsLoading(false);

      } catch (error) {
        console.error('Error loading map:', error);
        if (isMounted) {
          toast({
            title: "Error al cargar el mapa",
            description: "Por favor, recarga la página",
            variant: "destructive"
          });
          setIsLoading(false);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      markers.current.forEach(marker => {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      });
      markers.current = [];
    };
  }, [properties, toast]);

  return (
    <div className="grid grid-cols-1 w-full">
      <div className="aspect-[9/16] w-full relative bg-gray-100 rounded-lg overflow-hidden">
        <div 
          ref={mapRef}
          className="absolute inset-0 flex items-stretch"
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
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
            <CardContent className="py-2">
              <p className="text-base font-medium">Casas</p>
              <p className="text-2xl font-bold">{propertyCounts.house}</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="py-2">
              <p className="text-base font-medium">Terrenos</p>
              <p className="text-2xl font-bold">{propertyCounts.land}</p>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="py-2">
              <p className="text-base font-medium">Comercial</p>
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

                                {/* Agregar visualización de imágenes */}
                                {property.images && property.images.length > 0 && (
                                  <div className="mt-4">
                                    <h4 className="font-semibold mb-2">Imágenes de la Propiedad</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                      {property.images.map((image, index) => (
                                        <div key={index} className="relative aspect-video group">
                                          <img
                                            src={image}
                                            alt={`Imagen ${index + 1} de la propiedad ${property.propertyId}`}
                                            className="object-cover w-full h-full rounded-lg cursor-pointer"
                                            onClick={() => {
                                              window.open(image, '_blank');
                                            }}
                                          />
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-sm">Ver tamaño completo</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
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