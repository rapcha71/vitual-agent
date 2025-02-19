import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PropertyWithUser } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Image, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

export default function AdminWebPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [mapLoading, setMapLoading] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("table");

  // Si el usuario no es administrador, redirigir al dashboard
  useEffect(() => {
    if (user && !user.isAdmin) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  // Si no hay usuario autenticado, no renderizar nada
  if (!user) {
    return null;
  }

  // Optimized query with proper configuration
  const { data: properties = [], isLoading } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: user?.isAdmin === true
  });

  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (!mapContainerRef.current || activeTab !== "map") return;

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

        await loader.load();

        if (!isMounted || !mapContainerRef.current) return;

        // Initialize map
        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: 9.9281, lng: -84.0907 }, // Costa Rica
          zoom: 8,
        });

        mapRef.current = map;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Add markers if there are properties
        if (properties.length > 0 && isMounted) {
          properties.forEach(property => {
            try {
              const marker = new google.maps.Marker({
                map,
                position: { 
                  lat: property.location.lat, 
                  lng: property.location.lng 
                },
                title: `${property.propertyId} - ${property.user.fullName || property.user.username}`,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  fillColor: property.markerColor || '#F05023',
                  fillOpacity: 0.9,
                  strokeWeight: 1,
                  scale: 8
                }
              });
              markersRef.current.push(marker);
            } catch (error) {
              console.error('Error creating marker for property:', property.propertyId, error);
            }
          });
        }

        setMapLoading(false);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapLoading(false);
      }
    };

    // Only initialize map when on "map" tab and there are properties
    if (activeTab === "map" && properties.length > 0) {
      initMap();
    }

    return () => {
      isMounted = false;
      // Cleanup markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      // Clear map reference
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, [properties, activeTab]);

  // Contar propiedades por tipo
  const propertyCounts = {
    house: properties.filter(p => p.propertyType === 'house').length,
    land: properties.filter(p => p.propertyType === 'land').length,
    commercial: properties.filter(p => p.propertyType === 'commercial').length,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#F05023] px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/assets/logo.png"
              alt="Virtual Agent"
              className="h-12 w-auto"
            />
            <h1 className="text-white text-2xl font-bold">Panel de Administración</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:text-white/80"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Casas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{propertyCounts.house}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Terrenos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{propertyCounts.land}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Propiedades Comerciales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{propertyCounts.commercial}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="table" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start mb-6">
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Vista de Tabla
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Vista de Mapa
                </TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-0">
                {isLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2">Cargando propiedades...</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableCaption>Listado de todas las propiedades registradas</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID Propiedad</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Apodo</TableHead>
                          <TableHead>Teléfono Usuario</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Teléfono Rótulo (OCR)</TableHead>
                          <TableHead>Ubicación</TableHead>
                          <TableHead>Imágenes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {properties.map((property) => (
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
                            <TableCell>
                              {property.signPhoneNumber ? (
                                <span className="font-medium text-primary">
                                  {property.signPhoneNumber}
                                </span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {property.location.lat.toFixed(6)}, {property.location.lng.toFixed(6)}
                            </TableCell>
                            <TableCell>
                              {property.images.length > 0 ? (
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
                                    <div className="grid grid-cols-2 gap-4 p-4">
                                      {property.images.map((image, index) => (
                                        <div key={index} className="relative aspect-video group">
                                          <img
                                            src={image}
                                            alt={`Vista previa ${index + 1} de la propiedad ${property.propertyId}`}
                                            className="object-cover w-full h-full rounded-lg cursor-pointer"
                                            onClick={() => {
                                              window.open(image, '_blank');
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
                  </div>
                )}
              </TabsContent>

              <TabsContent value="map" className="mt-0">
                <div 
                  ref={mapContainerRef}
                  className="w-full h-[600px] rounded-lg relative bg-gray-100"
                >
                  {mapLoading && activeTab === "map" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Cargando mapa...</p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}