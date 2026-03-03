import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Image } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// Removed PhonePreview import
import { Loader2 } from "lucide-react";

export default function PropertiesPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

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
            </div>
          </header>

          <main className="page-content bg-cover bg-center bg-no-repeat content-wrapper" style={{backgroundImage: 'url("/assets/ciudad.jpeg")'}}>
            <div className="space-y-4">
              <h1 className="text-xl font-bold">
                Mis Propiedades
              </h1>

              <Card>
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
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Imagen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {properties.map((property) => (
                            <TableRow key={property.propertyId}>
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
                                        Ver Imagen
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Imagen de la Propiedad {property.propertyId}</DialogTitle>
                                      </DialogHeader>
                                      <div className="relative aspect-video">
                                        <img
                                          src={property.images.length > 1 ? property.images[1] : property.images[0]}
                                          alt={`Vista de la propiedad ${property.propertyId}`}
                                          className="object-cover w-full h-full rounded-lg cursor-pointer"
                                          onClick={() => window.open(property.images.length > 1 ? property.images[1] : property.images[0], '_blank')}
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="text-white text-sm">Ver tamaño completo</span>
                                        </div>
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
  );
}