import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, MapPin, Image } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Loader } from "@googlemaps/js-api-loader";
import { PhonePreview } from "@/components/ui/phone-preview";

export default function PropertiesPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [mapLoading, setMapLoading] = useState(true);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    staleTime: 300000,
    cacheTime: 600000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const initMap = async () => {
      try {
        if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
          console.error('Google Maps API key is missing');
          setMapLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          version: "weekly",
          libraries: ["places"]
        });

        const google = await loader.load();
        const mapElement = document.getElementById("map");
        if (!mapElement) {
          console.error('Map element not found');
          setMapLoading(false);
          return;
        }

        const map = new google.maps.Map(mapElement, {
          center: { lat: 9.9281, lng: -84.0907 },
          zoom: 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
          disableDefaultUI: true
        });

        if (properties.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          properties.forEach(property => {
            const marker = new google.maps.Marker({
              position: { 
                lat: property.location.lat, 
                lng: property.location.lng 
              },
              map,
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
              infoWindow.open(map, marker);
            });

            bounds.extend(marker.getPosition()!);
          });

          map.fitBounds(bounds);
        }
        setMapLoading(false);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapLoading(false);
      }
    };

    if (properties.length > 0) {
      initMap();
    }
  }, [properties]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <PhonePreview>
        <div className="flex flex-col h-full">
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

          <main 
            className="flex-1 overflow-y-auto bg-cover bg-center bg-fixed"
            style={{
              backgroundImage: 'url("/assets/ciudad.jpeg")',
              minHeight: 'calc(100vh - 64px)'
            }}
          >
            <div className="min-h-full p-4 space-y-4 backdrop-blur-[2px]">
              <h1 className="text-xl font-bold bg-white/90 backdrop-blur-sm p-3 rounded-lg">
                Mis Propiedades
              </h1>

              <Card className="bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Ubicación de Propiedades
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    id="map" 
                    className="w-full h-[300px] rounded-lg relative bg-gray-100"
                  >
                    {mapLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-sm">
                <CardContent className="p-6">
                  {isLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="mt-2">Cargando propiedades...</p>
                    </div>
                  ) : properties.length === 0 ? (
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