import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PropertyWithUser, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Image, MapPin, Shield, Users, Menu, LayoutGrid, Smartphone } from "lucide-react";
import { useLocation } from "wouter";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { PhonePreview } from "@/components/ui/phone-preview";

// Función para obtener el color según el tipo de propiedad
const getMarkerColor = (propertyType: string) => {
  switch (propertyType) {
    case 'house':
      return '#F05023'; // Rojo - color primario
    case 'land':
      return '#22C55E'; // Verde
    case 'commercial':
      return '#3B82F6'; // Azul
    default:
      return '#F05023';
  }
};

export default function AdminWebPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [mapLoading, setMapLoading] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("table");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

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
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: user?.isAdmin === true
  });

  // Query para obtener todos los usuarios
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.isSuperAdmin === true
  });

  // Mutation para actualizar roles (sin cambios)
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isAdmin })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Rol actualizado",
        description: "Los privilegios de administrador han sido actualizados exitosamente.",
      });
      setIsRoleDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar rol",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Inicialización del mapa
  useEffect(() => {
    let isMounted = true;

    const initializeMap = async () => {
      console.log('Iniciando inicialización del mapa...');

      if (!mapContainerRef.current || activeTab !== "map") {
        console.log('Contenedor no disponible o tab incorrecto');
        return;
      }

      try {
        setMapLoading(true);
        console.log('Estado de carga activado');

        // Verificar dimensiones del contenedor
        console.log('Dimensiones del contenedor:', {
          width: mapContainerRef.current.clientWidth,
          height: mapContainerRef.current.clientHeight
        });

        // Cargar Google Maps
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          version: "weekly"
        });

        console.log('Cargando API de Google Maps...');
        await loader.load();
        console.log('API de Google Maps cargada exitosamente');

        if (!isMounted) {
          console.log('Componente desmontado, cancelando inicialización');
          return;
        }

        // Crear mapa básico
        console.log('Creando instancia del mapa...');
        const map = new google.maps.Map(mapContainerRef.current, {
          center: { lat: 9.9281, lng: -84.0907 },
          zoom: 8
        });

        console.log('Mapa creado exitosamente');
        mapRef.current = map;

        // Agregar un solo marcador de prueba
        new google.maps.Marker({
          position: { lat: 9.9281, lng: -84.0907 },
          map,
          title: "Marcador de prueba"
        });

        console.log('Marcador de prueba agregado');
        setMapLoading(false);

      } catch (error) {
        console.error('Error en la inicialización del mapa:', error);
        setMapLoading(false);
        toast({
          title: "Error al cargar el mapa",
          description: "Por favor, actualice la página e intente nuevamente.",
          variant: "destructive"
        });
      }
    };

    if (activeTab === "map") {
      initializeMap();
    }

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, [activeTab, toast]);

  // Stats counts
  const propertyCounts = {
    house: properties.filter(p => p.propertyType === 'house').length,
    land: properties.filter(p => p.propertyType === 'land').length,
    commercial: properties.filter(p => p.propertyType === 'commercial').length,
  };

  const AdminContent = () => (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Card className="p-2">
          <CardHeader className="p-2">
            <CardTitle className="text-sm">Casas</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <p className="text-2xl font-bold">{propertyCounts.house}</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="p-2">
            <CardTitle className="text-sm">Terrenos</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <p className="text-2xl font-bold">{propertyCounts.land}</p>
          </CardContent>
        </Card>
        <Card className="p-2">
          <CardHeader className="p-2">
            <CardTitle className="text-sm">Locales</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <p className="text-2xl font-bold">{propertyCounts.commercial}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9 mb-4">
              <TabsTrigger value="table" className="text-xs flex items-center gap-1">
                <LayoutGrid className="h-3 w-3" />
                Tabla
              </TabsTrigger>
              <TabsTrigger value="map" className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Mapa
              </TabsTrigger>
            </TabsList>

            {/* Table View */}
            <TabsContent value="table" className="mt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Propiedad</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.propertyId}>
                        <TableCell>{property.propertyId}</TableCell>
                        <TableCell>{property.user.fullName || property.user.username}</TableCell>
                        <TableCell>
                          {property.propertyType === 'house' ? 'Casa' :
                            property.propertyType === 'land' ? 'Terreno' :
                              'Local Comercial'}
                        </TableCell>
                        <TableCell>{property.signPhoneNumber || '-'}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                Ver Detalles
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="w-[90%] max-w-[300px] p-4">
                              <DialogHeader>
                                <DialogTitle>Detalles de la Propiedad</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Imágenes</h4>
                                  <div className="grid grid-cols-1 gap-2 mt-2">
                                    {Array.isArray(property.images) ? property.images.map((image, idx) => (
                                      <img
                                        key={idx}
                                        src={image}
                                        alt={`Imagen ${idx + 1}`}
                                        className="w-full h-40 object-cover rounded-lg"
                                      />
                                    )) : (
                                      <p className="text-sm text-muted-foreground">No hay imágenes disponibles</p>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Ubicación</h4>
                                  <div className="p-2 bg-muted rounded-md">
                                    <p className="text-xs">
                                      {property.location.lat.toFixed(6)}, {property.location.lng.toFixed(6)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Map View */}
            <TabsContent value="map" className="mt-0">
              <div
                ref={mapContainerRef}
                style={{
                  width: '100%',
                  height: '400px',
                  position: 'relative',
                  backgroundColor: '#f3f4f6'
                }}
              >
                {mapLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </TabsContent>
            {user?.isSuperAdmin && (
              <TabsContent value="roles" className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.fullName || u.username}</TableCell>
                          <TableCell>
                            {u.isSuperAdmin ? 'Super Admin' : u.isAdmin ? 'Admin' : 'Usuario'}
                          </TableCell>
                          <TableCell>
                            {!u.isSuperAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setIsRoleDialogOpen(true);
                                }}
                              >
                                {u.isAdmin ? 'Revocar Admin' : 'Hacer Admin'}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex items-center justify-center min-h-screen">
        <PhonePreview>
          {/* Header */}
          <header className="bg-[#F05023] px-4 py-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                className="text-white hover:text-white/80 p-0"
                onClick={() => setLocation("/")}
              >
                <Menu className="h-5 w-5" />
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

          {/* Content */}
          <div className="p-4 overflow-y-auto">
            <AdminContent />
          </div>
        </PhonePreview>
      </div>
    </div>
  );
}