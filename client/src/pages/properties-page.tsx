import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, LogOut, Image, MapPin } from "lucide-react";
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
import { Loader } from "@googlemaps/js-api-loader";

type PropertyWithThumbnails = Property & {
  thumbnails?: string[];
};

export default function PropertiesPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [propertiesWithThumbnails, setPropertiesWithThumbnails] = useState<PropertyWithThumbnails[]>([]);
  const [mapLoading, setMapLoading] = useState(true);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  useEffect(() => {
    const generateThumbnails = async () => {
      if (!properties || properties.length === 0) {
        return;
      }

      const withThumbnails = await Promise.all(
        properties.map(async (property) => {
          const images = Array.isArray(property.images) ? property.images : [];

          if (images.length === 0) {
            return { ...property, thumbnails: [] };
          }

          const thumbnails = await Promise.all(
            images.map(async (img) => {
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
      setPropertiesWithThumbnails(withThumbnails);
    };

    if (properties.length > 0) {
      generateThumbnails();
    }
  }, [properties]);

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
          center: { lat: 9.9281, lng: -84.0907 }, // Costa Rica
          zoom: 8,
        });

        if (properties.length > 0) {
          properties.forEach(property => {
            new google.maps.Marker({
              position: { 
                lat: property.location.lat, 
                lng: property.location.lng 
              },
              map,
              title: property.propertyId,
            });
          });
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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-[#F05023] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            className="text-white hover:text-white/80 p-0"
            onClick={() => setLocation("/dashboard")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            className="text-white hover:text-white/80 p-0"
            onClick={() => setLocation("/property/new")}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
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
      <main className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Mis Propiedades</h1>

        <div className="grid grid-cols-1 gap-4">
          {/* Lista de Propiedades */}
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="mt-2">Cargando propiedades...</p>
                </div>
              ) : propertiesWithThumbnails.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No tienes propiedades registradas</p>
                </div>
              ) : (
                <Table>
                  <TableCaption>Listado de mis propiedades registradas</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Propiedad</TableHead>
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
                                          const originalImage = Array.isArray(property.images) ? property.images[index] : null;
                                          if (originalImage) {
                                            window.open(originalImage, '_blank');
                                          }
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

          {/* Mapa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ubicación de Propiedades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                id="map" 
                className="w-full h-[400px] rounded-lg relative bg-gray-100"
                style={{ minHeight: '400px' }}
              >
                {mapLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
