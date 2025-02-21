import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, MapPin, Image } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Loader } from "@googlemaps/js-api-loader";
import { PhonePreview } from "@/components/ui/phone-preview";
import { useToast } from "@/hooks/use-toast";

export default function PropertiesPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    let isMounted = true;
    let googleMap: google.maps.Map | null = null;
    let currentMarkers: google.maps.Marker[] = [];
    let currentInfoWindows: google.maps.InfoWindow[] = [];

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

        const google = await loader.load();

        if (!isMounted || !mapRef.current) return;

        const mapOptions: google.maps.MapOptions = {
          center: { lat: 9.9281, lng: -84.0907 },
          zoom: 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
          disableDefaultUI: true
        };

        googleMap = new google.maps.Map(mapRef.current, mapOptions);

        const bounds = new google.maps.LatLngBounds();

        properties.forEach(property => {
          const marker = new google.maps.Marker({
            position: { lat: property.location.lat, lng: property.location.lng },
            map: googleMap,
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

          const propertyImage = Array.isArray(property.images) && property.images.length > 0 
            ? property.images[0] 
            : null;

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; min-width: 200px; max-width: 300px;">
                <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: bold;">
                  Propiedad: ${property.propertyId}
                </h3>
                ${propertyImage ? `
                  <div style="margin: 8px 0;">
                    <img src="${propertyImage}" 
                         alt="Imagen de la propiedad" 
                         style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px;"
                    />
                  </div>
                ` : ''}
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
            `
          });

          marker.addListener('click', () => {
            currentInfoWindows.forEach(window => window.close());
            infoWindow.open(googleMap, marker);
          });

          bounds.extend(marker.getPosition()!);
          currentMarkers.push(marker);
          currentInfoWindows.push(infoWindow);
        });

        googleMap.fitBounds(bounds);
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
      if (currentMarkers.length > 0) {
        currentMarkers.forEach(marker => marker.setMap(null));
      }
      if (currentInfoWindows.length > 0) {
        currentInfoWindows.forEach(window => window.close());
      }
      if (googleMap) {
        google.maps.event.clearInstanceListeners(googleMap);
      }
    };
  }, [properties, toast]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <PhonePreview>
        <div className="flex flex-col h-full bg-white">
          <header className="bg-[#F05023] px-4 py-3 flex-none">
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

          <main className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              <h1 className="text-xl font-bold">
                Mis Propiedades
              </h1>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Ubicación de Propiedades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    ref={mapRef}
                    className="w-full h-[300px] rounded-lg relative bg-gray-100"
                    style={{ minHeight: '300px' }}
                  >
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  {properties.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No tienes propiedades registradas</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Imágenes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {properties.map((property) => (
                            <TableRow key={property.id}>
                              <TableCell className="font-medium">{property.propertyId}</TableCell>
                              <TableCell>
                                {property.propertyType === 'house' ? 'Casa' : 
                                 property.propertyType === 'land' ? 'Terreno' : 
                                 'Local Comercial'}
                              </TableCell>
                              <TableCell>{property.signPhoneNumber || '-'}</TableCell>
                              <TableCell>
                                {property.images && property.images.length > 0 ? (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Image className="h-4 w-4 mr-2" />
                                        Ver ({property.images.length})
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl">
                                      <DialogHeader>
                                        <DialogTitle>Imágenes de la Propiedad {property.propertyId}</DialogTitle>
                                      </DialogHeader>
                                      <div className="grid grid-cols-2 gap-4 p-4 max-h-[80vh] overflow-y-auto">
                                        {property.images.map((image, index) => (
                                          <div key={index} className="relative aspect-video group">
                                            <img
                                              src={image}
                                              alt={`Vista ${index + 1} de la propiedad ${property.propertyId}`}
                                              className="object-cover w-full h-full rounded-lg cursor-pointer"
                                              onClick={() => window.open(image, '_blank')}
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <span className="text-white text-sm">Ver tamaño completo</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                ) : (
                                  <span className="text-muted-foreground">Sin imágenes</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </PhonePreview>
    </div>
  );
}