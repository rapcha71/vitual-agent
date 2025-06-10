import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PropertyWithUser, insertMessageSchema, InsertMessage } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin, Image, ChevronLeft, Users, Plus, Trash2, MessageCircle, Loader2, Download } from "lucide-react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useEffect, useState, useRef, memo, useCallback } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useToast } from "@/hooks/use-toast";

import { Switch } from "@/components/ui/switch";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const MapComponent = memo(({ properties }: { properties: PropertyWithUser[] }) => {
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const { toast } = useToast();
  const [mapLoaded, setMapLoaded] = useState(false);

  // Cleanup function to remove markers and listeners
  const cleanupMap = useCallback(() => {
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => {
        google.maps.event.clearInstanceListeners(marker);
        marker.setMap(null);
      });
      markersRef.current = [];
    }

    if (infoWindowsRef.current.length > 0) {
      infoWindowsRef.current.forEach(window => window.close());
      infoWindowsRef.current = [];
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

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

        cleanupMap();

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

        map.current = new google.maps.Map(mapRef.current, mapOptions);
        const bounds = new google.maps.LatLngBounds();

        properties.forEach(property => {
          const marker = new google.maps.Marker({
            position: { lat: property.location.lat, lng: property.location.lng },
            map: map.current,
            title: property.propertyId,
            optimized: false,
            icon: {
              path: 'M12 0C7.802 0 4 3.403 4 7.602C4 11.8 7.469 16.812 12 24C16.531 16.812 20 11.8 20 7.602C20 3.403 16.199 0 12 0ZM12 11C10.343 11 9 9.657 9 8C9 6.343 10.343 5 12 5C13.657 5 15 6.343 15 8C15 9.657 13.657 11 12 11Z',
              fillColor: property.propertyType === 'house' ? '#F05023' :
                        property.propertyType === 'land' ? '#22C55E' : '#3B82F6',
              fillOpacity: 1,
              strokeWeight: 1,
              strokeColor: '#FFFFFF',
              scale: 1.5,
              anchor: new google.maps.Point(12, 24),
            }
          });

          const propertyImage = Array.isArray(property.images) && property.images.length > 0
            ? property.images[0]
            : null;

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
            infoWindowsRef.current.forEach(window => window.close());
            infoWindow.open(map.current, marker);
          });

          bounds.extend(marker.getPosition()!);
          markersRef.current.push(marker);
          infoWindowsRef.current.push(infoWindow);
        });

        if (properties.length > 0) {
          map.current.fitBounds(bounds);
        }

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
      cleanupMap();
    };
  }, [properties, toast, cleanupMap]);

  return (
    <div className="w-full h-[500px] relative bg-gray-100 rounded-lg overflow-hidden shadow-md">
      <div
        ref={mapRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
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

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    enabled: user?.isAdmin === true,
    staleTime: 30000, // 30 segundos de cache
    refetchOnWindowFocus: false
  });

  const { data: users = [], refetch: refetchUsers, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.isSuperAdmin === true && activeTab === "roles",
    staleTime: 60000, // 1 minuto de cache para usuarios
    refetchOnWindowFocus: false
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
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
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente",
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

  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const response = await fetch(`/api/admin/properties/${propertyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/properties'] })
      toast({
        title: "Propiedad eliminada",
        description: "La propiedad ha sido eliminada exitosamente",
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

  const messageForm = useForm<InsertMessage>({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: {
      content: "",
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      const response = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al enviar el mensaje');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mensaje enviado",
        description: "El mensaje ha sido enviado a todos los usuarios",
      });
      messageForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSendMessage = async (data: InsertMessage) => {
    try {
      await sendMessageMutation.mutateAsync(data);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

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
    <div className="min-h-screen bg-gray-100">
        <div className="relative w-full bg-white">
          <div className="fixed top-0 z-50 w-full">
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
                    className="h-8 md:h-12 lg:h-14 w-auto"
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

          <main className="pt-[60px] px-4 pb-4 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>
            
            {/* Botones adaptivos - Una fila en PC, dos filas en móvil */}
            <div className="flex flex-wrap gap-3 mb-6 md:flex-nowrap">
              <Button
                onClick={() => setLocation("/property/new")}
                variant="outline"
                size="default"
                className="inline-flex items-center justify-center px-4 py-2 flex-1 md:flex-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Propiedad
              </Button>
              
              {user.isSuperAdmin && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="default"
                      className="inline-flex items-center justify-center px-4 py-2 flex-1 md:flex-none"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Enviar Mensaje
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enviar Mensaje a Todos los Usuarios</DialogTitle>
                    </DialogHeader>
                    <Form {...messageForm}>
                      <form onSubmit={messageForm.handleSubmit(handleSendMessage)} className="space-y-4">
                        <FormField
                          control={messageForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mensaje</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Escriba su mensaje aquí..."
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="submit"
                            disabled={sendMessageMutation.isPending}
                          >
                            {sendMessageMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              "Enviar Mensaje"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
              
              {/* Botón de exportación CSV - Solo para administradores */}
              {(user.isAdmin || user.isSuperAdmin) && (
                <Button
                  onClick={() => window.open('/api/admin/export/properties', '_blank')}
                  variant="outline"
                  size="default"
                  className="inline-flex items-center justify-center px-4 py-2 flex-1 md:flex-none w-full md:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              )}
              
              {/* Botón de exportación de usuarios - Solo para super administradores */}
              {user.isSuperAdmin && (
                <Button
                  onClick={() => window.open('/api/admin/export/users', '_blank')}
                  variant="outline"
                  size="default"
                  className="inline-flex items-center justify-center px-4 py-2 flex-1 md:flex-none w-full md:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export. Usuarios
                </Button>
              )}
            </div>
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
              <TabsList className={`w-full h-12 ${user.isSuperAdmin ? 'grid-cols-4' : 'grid-cols-3'} grid`}>
                <TabsTrigger value="map" className="text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  Mapa
                </TabsTrigger>
                <TabsTrigger value="list" className="text-sm">
                  <Image className="h-4 w-4 mr-2" />
                  Lista
                </TabsTrigger>
                <TabsTrigger value="payments" className="text-sm">
                  <span className="mr-2">₡</span>
                  Pagos
                </TabsTrigger>
                {user.isSuperAdmin && (
                  <TabsTrigger value="roles" className="text-sm">
                    <Users className="h-4 w-4 mr-2" />
                    Roles
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="map" className="mt-4">
                {activeTab === "map" ? (
                  <MapComponent properties={properties} />
                ) : (
                  <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded">
                    <p className="text-gray-500">Mapa se cargará al seleccionar esta pestaña</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="list">
                {propertiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                    <span>Cargando propiedades...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">ID</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="hidden sm:table-cell">Usuario</TableHead>
                          <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                          <TableHead className="w-[140px]">Acciones</TableHead>
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
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
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
                              {user?.isSuperAdmin && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="w-8 h-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Confirmar eliminación</DialogTitle>
                                    </DialogHeader>
                                    <p>¿Está seguro que desea eliminar esta propiedad? Esta acción no se puede deshacer.</p>
                                    <DialogFooter>
                                      <Button
                                        variant="destructive"
                                        onClick={() => deletePropertyMutation.mutate(property.propertyId)}
                                        disabled={deletePropertyMutation.isPending}
                                      >
                                        {deletePropertyMutation.isPending ? (
                                          <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Eliminando...
                                          </>
                                        ) : (
                                          "Eliminar"
                                        )}
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold mb-4">Sistema de Pagos Semanales</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Pago de ₡250 por propiedad registrada • Corte semanal los viernes
                    </p>
                    
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Nombre Completo</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead className="text-center">Propiedades</TableHead>
                            <TableHead className="text-right">Pago Semanal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            // Calcular pagos solo para usuarios que han ingresado propiedades
                            const userPayments = properties.reduce((acc, property) => {
                              const userId = property.user.id;
                              if (!acc[userId]) {
                                acc[userId] = {
                                  user: property.user,
                                  propertyCount: 0
                                };
                              }
                              acc[userId].propertyCount++;
                              return acc;
                            }, {} as Record<number, { user: any; propertyCount: number }>);

                            // Filtrar solo usuarios con propiedades (propertyCount > 0)
                            const usersWithProperties = Object.values(userPayments).filter(
                              ({ propertyCount }) => propertyCount > 0
                            );

                            // Si no hay usuarios con propiedades, mostrar mensaje
                            if (usersWithProperties.length === 0) {
                              return (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                                    No hay usuarios con propiedades registradas esta semana
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            return usersWithProperties.map(({ user, propertyCount }) => {
                              const weeklyPayment = propertyCount * 250;
                              return (
                                <TableRow key={user.id}>
                                  <TableCell className="font-medium">{user.username}</TableCell>
                                  <TableCell>{user.fullName || 'Sin nombre'}</TableCell>
                                  <TableCell className="font-medium text-blue-600">
                                    {user.phoneNumber || 'Sin teléfono'}
                                  </TableCell>
                                  <TableCell className="text-center">{propertyCount}</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    ₡{weeklyPayment.toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              );
                            });
                          })()}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-blue-900">Total a Pagar Esta Semana</h4>
                          <p className="text-sm text-blue-700">
                            Próximo corte: {(() => {
                              const today = new Date();
                              const friday = new Date(today);
                              friday.setDate(today.getDate() + (5 - today.getDay()));
                              return friday.toLocaleDateString('es-CR');
                            })()}
                          </p>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">
                          ₡{(properties.length * 250).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {user.isSuperAdmin && (
                <TabsContent value="roles" className="mt-4">
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="overflow-x-auto -mx-6">
                          <div className="inline-block min-w-full align-middle">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-40">Usuario</TableHead>
                                  <TableHead className="w-32">Rol</TableHead>
                                  <TableHead className="w-24 text-right">Admin</TableHead>
                                  <TableHead className="w-20 text-right pr-6">Acciones</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {users.map((adminUser) => (
                                  <TableRow key={adminUser.id}>
                                    <TableCell className="py-2">{adminUser.fullName || adminUser.username}</TableCell>
                                    <TableCell className="py-2">
                                      {adminUser.isSuperAdmin ? 'Super Admin' :
                                       adminUser.isAdmin ? 'Admin' : 'Usuario'}
                                    </TableCell>
                                    <TableCell className="py-2 text-right">
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
                                    <TableCell className="py-2 text-right pr-6">
                                      {!adminUser.isSuperAdmin && (
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              className="w-8 h-8 p-0"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent>
                                            <DialogHeader>
                                              <DialogTitle>Confirmar eliminación</DialogTitle>
                                            </DialogHeader>
                                            <p>¿Está seguro que desea eliminar este usuario? Esta acción no se puede deshacer.</p>
                                            <DialogFooter>
                                              <Button
                                                variant="destructive"
                                                onClick={() => deleteUserMutation.mutate(adminUser.id)}
                                                disabled={deleteUserMutation.isPending}
                                              >
                                                {deleteUserMutation.isPending ? (
                                                  <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Eliminando...
                                                  </>
                                                ) : (
                                                  "Eliminar"
                                                )}
                                              </Button>
                                            </DialogFooter>
                                          </DialogContent>
                                        </Dialog>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </main>
        </div>
    </div>
  );
}