import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PropertyWithUser } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Image, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { compressImageForThumbnail } from "@/lib/utils";
import React, { useEffect, useState } from "react";
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

  // Obtener todas las propiedades con información de usuarios
  const { data: properties = [], isLoading } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    enabled: user?.isAdmin === true
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
          return;
        }

        const map = new google.maps.Map(mapElement, {
          center: { lat: 9.9281, lng: -84.0907 }, // Costa Rica
          zoom: 8,
        });

        setMap(map);
        setMapLoading(false);

        // Add KML and markers if there are properties
        if (properties.length > 0) {
          properties.forEach(property => {
            if (property.kmlData) {
              const kmlLayer = new google.maps.KmlLayer({
                url: property.kmlData,
                map: map,
                preserveViewport: true
              });
            }

            // Add marker with corresponding color
            new google.maps.Marker({
              position: { 
                lat: property.location.lat, 
                lng: property.location.lng 
              },
              map,
              title: `${property.propertyId} - ${property.user.fullName || property.user.username}`,
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
    console.log("Properties data:", properties);
    const generateThumbnails = async () => {
      if (!properties || properties.length === 0) {
        console.log("No properties available");
        return;
      }

      const withThumbnails = await Promise.all(
        properties.map(async (property) => {
          console.log("Processing property:", property.propertyId);
          if (!property.images || property.images.length === 0) {
            console.log("No images for property:", property.propertyId);
            return { ...property, thumbnails: [] };
          }

          console.log("Generating thumbnails for property:", property.propertyId);
          const thumbnails = await Promise.all(
            property.images.map(async (img) => {
              try {
                return await compressImageForThumbnail(img);
              } catch (error) {
                console.error("Error compressing image:", error);
                return img;
              }
            })
          );

          return { ...property, thumbnails };
        })
      );
      console.log("Generated thumbnails:", withThumbnails);
      setPropertiesWithThumbnails(withThumbnails);
    };

    if (properties.length > 0) {
      generateThumbnails();
    }
  }, [properties]);

  // Si el usuario no es administrador, redirigir al dashboard
  if (!user?.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

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
            src="/assets/logo.png"
            alt="Virtual Agent"
            className="h-10 md:h-12 lg:h-14 w-auto"
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
              <CardContent>
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
                        <TableHead>Operación</TableHead>
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
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              property.operationType === 'Venta' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {property.operationType || 'Sin definir'}
                            </span>
                          </TableCell>
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
                              <div className="flex gap-2">
                                {/* Miniatura de rótulo */}
                                {property.images[0] && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                                        <img
                                          src={property.images[0]}
                                          alt="Rótulo"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Foto del Rótulo - {property.propertyId}</DialogTitle>
                                      </DialogHeader>
                                      <div className="py-4">
                                        <img
                                          src={property.images[0]}
                                          alt="Foto del rótulo"
                                          className="w-full h-auto rounded-lg"
                                        />
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                                
                                {/* Miniatura de propiedad */}
                                {property.images[1] && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                                        <img
                                          src={property.images[1]}
                                          alt="Propiedad"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                      <DialogHeader>
                                        <DialogTitle>Foto de la Propiedad - {property.propertyId}</DialogTitle>
                                      </DialogHeader>
                                      <div className="py-4">
                                        <img
                                          src={property.images[1]}
                                          alt="Foto de la propiedad"
                                          className="w-full h-auto rounded-lg"
                                        />
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                                
                                {/* Botón para ver todas las imágenes si hay más */}
                                {property.images.length > 2 && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm" className="text-xs">
                                        +{property.images.length - 2}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl">
                                      <DialogHeader>
                                        <DialogTitle>Todas las Imágenes - {property.propertyId}</DialogTitle>
                                      </DialogHeader>
                                      <div className="grid grid-cols-2 gap-4 p-4 max-h-[80vh] overflow-y-auto">
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
                                              <span className="text-white text-sm">
                                                {index === 0 ? 'Rótulo' : index === 1 ? 'Propiedad' : `Imagen ${index + 1}`}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
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