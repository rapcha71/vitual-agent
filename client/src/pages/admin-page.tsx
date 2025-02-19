import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { PropertyWithUser } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Image } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: properties = [], isLoading } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    enabled: user?.isAdmin === true
  });

  // Si el usuario no es administrador, redirigir a la página principal
  if (!user?.isAdmin) {
    setLocation("/");
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-7xl p-4 space-y-4">
        <header className="bg-[#F05023] px-4 py-3 rounded-lg flex items-center justify-between">
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

        <Card>
          <CardHeader>
            <CardTitle>Panel de Administración - Propiedades Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Cargando propiedades...</div>
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
                      <TableCell>{property.signPhoneNumber || '-'}</TableCell>
                      <TableCell>
                        {property.location.lat.toFixed(6)}, {property.location.lng.toFixed(6)}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Image className="h-4 w-4 mr-2" />
                              Ver Imágenes ({Array.isArray(property.images) ? property.images.length : 0})
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Imágenes de la Propiedad {property.propertyId}</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 p-4">
                              {Array.isArray(property.images) && property.images.map((image, index) => (
                                <div key={index} className="relative aspect-square">
                                  <img
                                    src={image}
                                    alt={`Imagen ${index + 1} de la propiedad ${property.propertyId}`}
                                    className="object-cover w-full h-full rounded-lg"
                                  />
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}