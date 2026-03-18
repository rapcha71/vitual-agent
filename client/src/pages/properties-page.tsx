import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Image } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

function PropertyImageContent({ propertyId, enabled }: { propertyId: string; enabled: boolean }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/properties/${propertyId}/images`],
    queryFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}/images`, { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar');
      return res.json();
    },
    staleTime: 60000,
    enabled,
  });

  if (!enabled) return null;
  if (isLoading) {
    return (
      <div className="relative aspect-video flex items-center justify-center bg-gray-100 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (isError) return <p className="text-red-500 py-4">Error al cargar la imagen</p>;
  const images: string[] = data?.images || [];
  if (images.length === 0) return <p className="text-gray-500 py-4">Sin imágenes</p>;
  const imgSrc = images.length > 1 ? images[1] : images[0];
  return (
    <div className="relative aspect-video">
      <img src={imgSrc} alt={`Propiedad ${propertyId}`} className="object-cover w-full h-full rounded-lg cursor-pointer" onClick={() => window.open(imgSrc, '_blank')} />
      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-sm">Ver tamaño completo</span>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [imageDialogPropertyId, setImageDialogPropertyId] = useState<string | null>(null);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="full-screen-layout bg-gray-100">
      <header className="page-header">
        <div className="flex items-center justify-between content-wrapper">
              <Button 
                variant="ghost" 
                className="text-white hover:text-white/80 p-0"
                onClick={() => setLocation("/")}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center">
                <img 
                  src="/assets/logo-full.png"
                  alt="Virtual Agent"
                  className="h-14 w-auto max-w-[60vw] object-contain header-logo-2x"
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

          <main className="page-content bg-cover bg-center bg-no-repeat content-wrapper" style={{backgroundImage: 'url("/assets/ciudad-optimized.webp")'}}>
            <div className="space-y-4 bg-white rounded-lg p-4 md:p-6 shadow-md">
              <h1 className="text-xl font-bold text-gray-900">
                Mis Propiedades
              </h1>

              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-6 bg-white">
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
                    <div className="overflow-x-auto">
                      <Table className="[&_th]:bg-white [&_th]:text-gray-800 [&_td]:bg-white [&_td]:text-gray-900">
                        <TableHeader>
                          <TableRow className="bg-white hover:bg-gray-50 border-gray-200">
                            <TableHead>ID</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Imagen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {properties.map((property) => (
                            <TableRow key={property.propertyId} className="bg-white hover:bg-gray-50 border-gray-200">
                              <TableCell className="font-medium">{property.propertyId}</TableCell>
                              <TableCell>
                                {property.propertyType === 'house' ? 'Casa' : 
                                 property.propertyType === 'land' ? 'Terreno' : 
                                 'Local Comercial'}
                              </TableCell>
                              <TableCell>{property.signPhoneNumber || '-'}</TableCell>
                              <TableCell>
                                {(property as any).hasImages ? (
                                  <Dialog open={imageDialogPropertyId === property.propertyId} onOpenChange={(open) => setImageDialogPropertyId(open ? property.propertyId : null)}>
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Image className="h-4 w-4 mr-2" />
                                        Ver Imagen
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-white [&>*]:bg-white [&_button]:text-gray-900 [&_button]:hover:bg-gray-100">
                                      <DialogHeader className="bg-white">
                                        <DialogTitle className="text-gray-900">Imagen de la Propiedad {property.propertyId}</DialogTitle>
                                      </DialogHeader>
                                      <PropertyImageContent propertyId={property.propertyId} enabled={imageDialogPropertyId === property.propertyId} />
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
  );
}