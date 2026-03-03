import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PropertyWithUser } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Image, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
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
  const [searchPropertyId, setSearchPropertyId] = useState('');
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // Obtener todas las propiedades con información de usuarios
  const { data: properties = [], isLoading, error } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    enabled: user?.isAdmin === true,
    retry: 3,
    staleTime: 0,
    refetchOnWindowFocus: false
  });

  // Log para debugging
  useEffect(() => {
    console.log('Admin query state:', { properties: properties.length, isLoading, error });
  }, [properties, isLoading, error]);

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

        // Wait a bit to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        const mapElement = document.getElementById("map");
        if (!mapElement) {
          console.error('Map element not found');
          setMapLoading(false);
          return;
        }

        const mapInstance = new google.maps.Map(mapElement, {
          center: { lat: 9.9281, lng: -84.0907 }, // Costa Rica
          zoom: 8,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true
        });

        setMap(mapInstance);
        setMapLoading(false);

        // Add markers with optimized rendering
        if (properties.length > 0) {
          const newMarkers: google.maps.Marker[] = [];

          properties.forEach(property => {
            // Create optimized marker
            const marker = new google.maps.Marker({
              position: { 
                lat: property.location.lat, 
                lng: property.location.lng 
              },
              map,
              title: `${property.propertyId} - ${property.user.fullName || property.user.username}`,
              optimized: true, // Enable marker optimization
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: property.markerColor || '#F05023',
                fillOpacity: 0.8,
                strokeWeight: 1,
                strokeColor: '#FFFFFF',
                scale: 8
              }
            });

            // Add click listener for property info
            marker.addListener('click', () => {
              const infoWindow = new google.maps.InfoWindow({
                content: `
                  <div style="padding: 8px;">
                    <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">
                      Propiedad ${property.propertyId}
                    </h3>
                    <p style="margin: 0; font-size: 12px;">
                      Usuario: ${property.user.fullName || property.user.username}
                    </p>
                    <p style="margin: 0; font-size: 12px;">
                      Tipo: ${property.propertyType === 'house' ? 'Casa' : 
                             property.propertyType === 'land' ? 'Terreno' : 'Comercial'}
                    </p>
                  </div>
                `
              });
              infoWindow.open(map, marker);
            });

            newMarkers.push(marker);
          });

          setMarkers(newMarkers);
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setMapLoading(false);
      }
    };

    initMap();
  }, [properties]);

  // Generate thumbnails for better performance with memoization
  const propertiesWithThumbnails = useMemo(() => {
    if (!properties.length) return [];

    return properties.map(property => {
      if (!property.images || property.images.length === 0) {
        return { ...property, thumbnails: [] };
      }

      // Use a simple thumbnail strategy instead of heavy compression
      const thumbnails = property.images.map(img => img);
      return { ...property, thumbnails };
    });
  }, [properties]);

  useEffect(() => {
    setPropertiesWithThumbnails(propertiesWithThumbnails);
  }, [propertiesWithThumbnails]);

  // If the user is not an admin, redirect to the dashboard
  if (!user?.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  // Search function for property by ID
  const searchPropertyOnMap = () => {
    if (!map || !searchPropertyId.trim()) return;

    const property = properties.find(p => 
      p.propertyId.toLowerCase().includes(searchPropertyId.toLowerCase())
    );

    if (property) {
      // Center map on found property
      map.setCenter({
        lat: property.location.lat,
        lng: property.location.lng
      });
      map.setZoom(16);

      // Find and highlight the marker
      const marker = markers.find(m => 
        m.getTitle()?.includes(property.propertyId)
      );

      if (marker) {
        // Create info window for found property
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #F05023;">
                Propiedad Encontrada: ${property.propertyId}
              </h3>
              <p style="margin: 0; font-size: 12px;">
                Usuario: ${property.user.fullName || property.user.username}
              </p>
              <p style="margin: 0; font-size: 12px;">
                Tipo: ${property.propertyType === 'house' ? 'Casa' : 
                       property.propertyType === 'land' ? 'Terreno' : 'Comercial'}
              </p>
              <p style="margin: 0; font-size: 12px;">
                Teléfono: ${property.signPhoneNumber || 'No disponible'}
              </p>
            </div>
          `
        });
        infoWindow.open(map, marker);
      }
    } else {
      alert('Propiedad no encontrada');
    }
  };

  // Contar propiedades por tipo
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
          onClick={() => setLocation("/dashboard")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <img 
            src="/assets/logo-full.png"
            alt="Virtual Agent"
            className="h-14 w-auto max-w-[60vw] object-contain"
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
      <main className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Panel de Administración</h1>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de Propiedades</CardTitle>
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

        <Tabs defaultValue="map" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Propiedades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map">
            <Card>
              <CardContent className="space-y-4">
                {/* Search by Property ID */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Buscar por ID de propiedad..."
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                    value={searchPropertyId}
                    onChange={(e) => setSearchPropertyId(e.target.value)}
                  />
                  <Button 
                    onClick={searchPropertyOnMap}
                    size="sm"
                    disabled={!searchPropertyId.trim()}
                  >
                    Buscar
                  </Button>
                </div>

                <div 
                  id="map" 
                  className="w-full h-[600px] rounded-lg relative bg-gray-100"
                  style={{ minHeight: '600px' }}
                >
                  {mapLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="properties">
            <Card>
              <CardContent>
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
                            {property.thumbnails && property.thumbnails.length > 0 ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Image className="h-4 w-4 mr-2" />
                                    Ver Imágenes ({property.thumbnails.length})
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