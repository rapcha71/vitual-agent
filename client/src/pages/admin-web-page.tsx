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

export default function AdminWebPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [mapLoading, setMapLoading] = useState(true);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("table");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDesktopView, setIsDesktopView] = useState(false);

  // Effect to check window size - disabled for testing
  /*useEffect(() => {
    const checkSize = () => {
      setIsDesktopView(window.innerWidth >= 1024);
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);*/

  // Query para obtener todos los usuarios
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.isSuperAdmin === true
  });

  // Mutation para actualizar roles
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

  const AdminContent = () => (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            <CardTitle>Locales Comerciales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{propertyCounts.commercial}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <Tabs defaultValue="table" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start mb-4">
              <TabsTrigger value="table" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Vista de Tabla
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Vista de Mapa
              </TabsTrigger>
              {user?.isSuperAdmin && (
                <TabsTrigger value="roles" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Gestión de Roles
                </TabsTrigger>
              )}
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
                            <DialogContent className="w-[calc(100%-2rem)] max-w-lg mx-auto">
                              <DialogHeader>
                                <DialogTitle>Detalles de la Propiedad</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium">Imágenes</h4>
                                  <div className="grid grid-cols-1 gap-2 mt-2">
                                    {Array.isArray(property.images) ? property.images.map((image, idx) => (
                                      <img 
                                        key={idx}
                                        src={image}
                                        alt={`Imagen ${idx + 1}`}
                                        className="w-full h-48 object-cover rounded-lg"
                                      />
                                    )) : (
                                      <p className="text-sm text-muted-foreground">No hay imágenes disponibles</p>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium">Ubicación</h4>
                                  <p className="text-sm">
                                    {property.location.lat.toFixed(6)}, {property.location.lng.toFixed(6)}
                                  </p>
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
                className="w-full h-[400px] rounded-lg relative"
              >
                {mapLoading && activeTab === "map" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Roles Management */}
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

  // Render different layouts based on screen size
  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* View Toggle Button */}
      <Button
        className="fixed top-4 right-4 z-50"
        onClick={() => setIsDesktopView(!isDesktopView)}
      >
        {isDesktopView ? (
          <>
            <Smartphone className="h-4 w-4 mr-2" />
            Ver Móvil
          </>
        ) : (
          <>
            <LayoutGrid className="h-4 w-4 mr-2" />
            Ver Escritorio
          </>
        )}
      </Button>

      {isDesktopView ? (
        <div className="min-h-screen bg-gray-100">
          {/* Desktop Header */}
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
                className="text-white hover:text-white/80"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </header>

          {/* Desktop Main Content */}
          <main className="container mx-auto py-6">
            <AdminContent />
          </main>
        </div>
      ) : (
        // Mobile View using PhonePreview
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <PhonePreview>
            {/* Mobile Header */}
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

            {/* Mobile Content */}
            <div className="p-4 overflow-y-auto">
              <AdminContent />
            </div>
          </PhonePreview>
        </div>
      )}
    </div>
  );
}