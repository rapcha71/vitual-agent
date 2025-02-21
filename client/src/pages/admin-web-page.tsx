import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PropertyWithUser } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin, Image, ChevronLeft, Users } from "lucide-react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useRef, memo } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useToast } from "@/hooks/use-toast";
import { PhonePreview } from "@/components/ui/phone-preview";
import { Switch } from "@/components/ui/switch";

const MapComponent = memo(({ properties }: { properties: PropertyWithUser[] }) => {
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    let googleMap: google.maps.Map | null = null;
    let currentMarkers: google.maps.Marker[] = [];
    let currentInfoWindows: google.maps.InfoWindow[] = [];

    const initMap = async () => {
      if (!mapRef.current || !properties.length) {
        setIsLoading(false);
        return;
      }

      try {
        if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
          console.error('Google Maps API key is missing');
          setIsLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          version: "weekly",
          libraries: ["places"]
        });

        const google = await loader.load();

        if (!isMounted || !mapRef.current) return;

        const mapOptions: google.maps.MapOptions = {
          center: { lat: 9.9281, lng: -84.0907 },
          zoom: 8,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'greedy',
          disableDefaultUI: true
        };

        googleMap = new google.maps.Map(mapRef.current, mapOptions);
        map.current = googleMap;

        currentMarkers.forEach(marker => marker.setMap(null));
        currentMarkers = [];
        currentInfoWindows = [];

        const bounds = new google.maps.LatLngBounds();

        properties.forEach(property => {
          const marker = new google.maps.Marker({
            position: { lat: property.location.lat, lng: property.location.lng },
            map: googleMap,
            title: property.propertyId,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: property.propertyType === 'house' ? '#F05023' :
                        property.propertyType === 'land' ? '#22C55E' : '#3B82F6',
              fillOpacity: 0.9,
              strokeWeight: 2,
              scale: 8
            }
          });

          const propertyImage = Array.isArray(property.images) && property.images.length > 1 
            ? property.images[1] 
            : (Array.isArray(property.images) && property.images.length > 0 
              ? property.images[0] 
              : null);

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; min-width: 200px; max-width: 300px;">
                <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: bold;">
                  Propiedad: ${property.propertyId}
                </h3>
                ${propertyImage ? `
                  <div style="margin: 8px 0;">
                    <img src="${propertyImage}" 
                         alt="Imagen de la propiedad" 
                         style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px;"
                    />
                  </div>
                ` : ''}
                <p style="margin: 0 0 6px; font-size: 12px;">
                  Tipo: ${
                    property.propertyType === 'house' ? 'Casa' :
                    property.propertyType === 'land' ? 'Terreno' :
                    'Local Comercial'
                  }
                </p>
                <p style="margin: 6px 0; font-size: 12px;">
                  Teléfono: ${property.signPhoneNumber || 'No disponible'}
                </p>
              </div>
            `,
            maxWidth: 300
          });

          marker.addListener('click', () => {
            currentInfoWindows.forEach(window => window.close());
            infoWindow.open(googleMap, marker);
          });

          bounds.extend(marker.getPosition()!);
          currentMarkers.push(marker);
          currentInfoWindows.push(infoWindow);
        });

        googleMap.fitBounds(bounds);
        markers.current = currentMarkers;

        if (isMounted) {
          setIsLoading(false);
        }

      } catch (error) {
        console.error('Error loading map:', error);
        if (isMounted) {
          toast({
            title: "Error al cargar el mapa",
            description: "Por favor, recarga la página",
            variant: "destructive"
          });
          setIsLoading(false);
        }
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (currentMarkers.length > 0) {
        currentMarkers.forEach(marker => {
          marker.setMap(null);
        });
      }
      if (currentInfoWindows.length > 0) {
        currentInfoWindows.forEach(window => window.close());
      }
      if (googleMap) {
        google.maps.event.clearInstanceListeners(googleMap);
      }
    };
  }, [properties, toast]);

  return (
    <div className="w-full h-[500px] relative bg-gray-100 rounded-lg overflow-hidden shadow-md">
      <div
        ref={mapRef}
        className="absolute inset-0"
        style={{
          width: '100%',
          height: '100%'
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
});

MapComponent.displayName = 'MapComponent';

export default function AdminWebPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("map");
  const { toast } = useToast();

  const { data: properties = [] } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    enabled: user?.isAdmin === true
  });

  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: user?.isSuperAdmin === true
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string, isAdmin: boolean }) => {
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
      refetchUsers();
      toast({
        title: "Rol actualizado",
        description: "El rol del usuario ha sido actualizado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (!user?.isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  const propertyCounts = {
    house: properties.filter(p => p.propertyType === 'house').length,
    land: properties.filter(p => p.propertyType === 'land').length,
    commercial: properties.filter(p => p.propertyType === 'commercial').length,
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <PhonePreview>
        <div className="relative w-full max-w-[430px] bg-white">
          <div className="fixed top-0 z-50 w-full max-w-[430px]">
            <div className="bg-[#F05023] w-full">
              <div className="px-4 py-3 flex items-center justify-between">
                <Button
                  variant="ghost"
                  className="text-white hover:text-white/80 p-0"
                  onClick={() => setLocation("/dashboard")}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 flex justify-center">
                  <img
                    src="/assets/logo.png"
                    alt="Virtual Agent"
                    className="h-8 w-auto"
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
            </div>
          </div>

          <main className="pt-[60px] px-4 pb-4">
            <h1 className="text-xl font-bold">Panel de Administración</h1>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <Card className="bg-white shadow-sm">
                <CardContent className="py-2">
                  <p className="text-base font-medium">Casas</p>
                  <p className="text-2xl font-bold">{propertyCounts.house}</p>
                </CardContent>
              </Card>
              <Card className="bg-white shadow-sm">
                <CardContent className="py-2">
                  <p className="text-base font-medium">Terrenos</p>
                  <p className="text-2xl font-bold">{propertyCounts.land}</p>
                </CardContent>
              </Card>
              <Card className="bg-white shadow-sm">
                <CardContent className="py-2">
                  <p className="text-base font-medium">Comercial</p>
                  <p className="text-2xl font-bold">{propertyCounts.commercial}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
              <TabsList className="w-full grid grid-cols-3 h-12">
                <TabsTrigger value="map" className="text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Mapa
                </TabsTrigger>
                <TabsTrigger value="list" className="text-sm">
                  <Image className="h-4 w-4 mr-2" />
                  Lista
                </TabsTrigger>
                {user.isSuperAdmin && (
                  <TabsTrigger value="roles" className="text-sm">
                    <Users className="h-4 w-4 mr-2" />
                    Roles
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="map" className="mt-4">
                <MapComponent properties={properties} />
              </TabsContent>

              <TabsContent value="list">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">ID</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="hidden sm:table-cell">Usuario</TableHead>
                        <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                        <TableHead className="w-24">Ver</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties.map((property) => (
                        <TableRow key={property.propertyId}>
                          <TableCell className="font-medium">{property.propertyId}</TableCell>
                          <TableCell>
                            {property.propertyType === 'house' ? 'Casa' :
                              property.propertyType === 'land' ? 'Terreno' :
                                'Comercial'}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {property.user.fullName || property.user.username}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {property.signPhoneNumber || '-'}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full">
                                  Detalles
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="w-[90vw] max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>Detalles de la Propiedad</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="sm:hidden">
                                    <p><strong>Usuario:</strong> {property.user.fullName || property.user.username}</p>
                                    <p><strong>Teléfono:</strong> {property.signPhoneNumber || '-'}</p>
                                  </div>
                                  <p><strong>Ubicación:</strong> {property.location.lat.toFixed(6)}, {property.location.lng.toFixed(6)}</p>
                                  {property.images && property.images.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="font-semibold mb-2">Imágenes de la Propiedad</h4>
                                      <div className="grid grid-cols-2 gap-2">
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
                                              <span className="text-white text-sm">Ver tamaño completo</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
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

              {user.isSuperAdmin && (
                <TabsContent value="roles" className="mt-4">
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="pt-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Usuario</TableHead>
                              <TableHead>Rol</TableHead>
                              <TableHead className="w-[100px]">Admin</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((adminUser) => (
                              <TableRow key={adminUser.id}>
                                <TableCell>{adminUser.fullName || adminUser.username}</TableCell>
                                <TableCell>
                                  {adminUser.isSuperAdmin ? 'Super Admin' : 
                                   adminUser.isAdmin ? 'Admin' : 'Usuario'}
                                </TableCell>
                                <TableCell>
                                  {!adminUser.isSuperAdmin && (
                                    <Switch
                                      checked={adminUser.isAdmin}
                                      onCheckedChange={(checked) => 
                                        updateRoleMutation.mutate({ 
                                          userId: adminUser.id, 
                                          isAdmin: checked 
                                        })
                                      }
                                      disabled={updateRoleMutation.isPending}
                                    />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </main>
        </div>
      </PhonePreview>
    </div>
  );
}