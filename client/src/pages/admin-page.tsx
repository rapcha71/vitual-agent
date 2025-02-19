import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PropertyWithUser } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Image, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { compressImageForThumbnail } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader } from "@googlemaps/js-api-loader";

type PropertyWithThumbnails = PropertyWithUser & {
  thumbnails?: string[];
};

export default function AdminPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [propertiesWithThumbnails, setPropertiesWithThumbnails] = useState<PropertyWithThumbnails[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  const { data: properties = [], isLoading } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    enabled: user?.isAdmin === true
  });

  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          version: "weekly",
        });

        const google = await loader.load();
        const mapElement = document.getElementById("map");
        if (!mapElement) return;

        const map = new google.maps.Map(mapElement, {
          center: { lat: -34.397, lng: 150.644 },
          zoom: 8,
        });

        setMap(map);
        setMapLoading(false);

        // Añadir KML si hay propiedades
        if (properties.length > 0) {
          properties.forEach(property => {
            if (property.kmlData) {
              const kmlLayer = new google.maps.KmlLayer({
                url: property.kmlData,
                map: map,
              });
            }

            // Añadir marcador con el color correspondiente
            new google.maps.Marker({
              position: { 
                lat: property.location.lat, 
                lng: property.location.lng 
              },
              map,
              title: property.propertyId,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: property.markerColor,
                fillOpacity: 0.8,
                strokeWeight: 1,
                scale: 8
              }
            });
          });
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapLoading(false);
      }
    };

    if (properties.length > 0) {
      initMap();
    }
  }, [properties]);

  useEffect(() => {
    const generateThumbnails = async () => {
      const withThumbnails = await Promise.all(
        properties.map(async (property) => {
          if (!property.images || property.images.length === 0) {
            return { ...property, thumbnails: [] };
          }

          const thumbnails = await Promise.all(
            property.images.map(img => compressImageForThumbnail(img))
          );

          return { ...property, thumbnails };
        })
      );
      setPropertiesWithThumbnails(withThumbnails);
    };

    if (properties.length > 0) {
      generateThumbnails();
    }
  }, [properties]);

  // Si el usuario no es administrador, redirigir a la página principal
  if (!user?.isAdmin) {
    setLocation("/");
    return null;
  }

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
      <main className="p-4">
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Panel de Administración</CardTitle>
          </CardHeader>
        </Card>

        <Tabs defaultValue="map" className="w-full">
          <TabsList>
            <TabsTrigger value="map">
              <MapPin className="h-4 w-4 mr-2" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="properties">
              <Image className="h-4 w-4 mr-2" />
              Propiedades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <div id="map" className="w-full h-[600px] rounded-lg">
                  {mapLoading && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2">Cargando propiedades...</p>
                  </div>
                ) : (
                  <Table>
                    <TableCaption>Listado de todas las propiedades registradas</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID Propiedad</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Apodo</TableHead>
                        <TableHead>Teléfono Usuario</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Teléfono Rótulo</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>Imágenes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {propertiesWithThumbnails.map((property) => (
                        <TableRow key={property.id}>
                          <TableCell>{property.propertyId}</TableCell>
                          <TableCell>{property.user.fullName || property.user.username}</TableCell>
                          <TableCell>{property.user.nickname || '-'}</TableCell>
                          <TableCell>{property.user.mobile || '-'}</TableCell>
                          <TableCell>
                            {property.propertyType === 'house' ? 'Casa' : 
                             property.propertyType === 'land' ? 'Terreno' : 
                             'Local Comercial'}
                          </TableCell>
                          <TableCell>{property.signPhoneNumber || '-'}</TableCell>
                          <TableCell>
                            {property.location.lat.toFixed(6)}, {property.location.lng.toFixed(6)}
                          </TableCell>
                          <TableCell>
                            {property.images && property.images.length > 0 ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Image className="h-4 w-4 mr-2" />
                                    Ver Imágenes ({property.images.length})
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <DialogHeader>
                                    <DialogTitle>Imágenes de la Propiedad {property.propertyId}</DialogTitle>
                                  </DialogHeader>
                                  <div className="grid grid-cols-2 gap-4 p-4 max-h-[80vh] overflow-y-auto">
                                    {property.thumbnails?.map((thumbnail, index) => (
                                      <div key={index} className="relative aspect-video group">
                                        <img
                                          src={thumbnail}
                                          alt={`Vista previa ${index + 1} de la propiedad ${property.propertyId}`}
                                          className="object-cover w-full h-full rounded-lg cursor-pointer"
                                          onClick={() => {
                                            window.open(property.images[index], '_blank');
                                          }}
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="text-white text-sm">Click para ver tamaño completo</span>
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}