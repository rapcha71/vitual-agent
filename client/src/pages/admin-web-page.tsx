import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PropertyWithUser, insertMessageSchema, InsertMessage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin, Image, ChevronLeft, Users, Plus, Trash2, MessageCircle, Loader2, DollarSign, MessageSquare, Share2, FileSpreadsheet, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useEffect, useState, useRef, memo, useCallback, forwardRef, useImperativeHandle } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { List } from "lucide-react";

const MapComponent = memo(forwardRef(({ properties }: { properties: PropertyWithUser[] }, ref) => {
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowsRef = useRef<google.maps.InfoWindow[]>([]);
  const { toast } = useToast();

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

  const addMarkers = useCallback((propertiesToDisplay: PropertyWithUser[]) => {
    if (!map.current || !propertiesToDisplay.length) return;

    cleanupMap();
    const bounds = new google.maps.LatLngBounds();

    propertiesToDisplay.forEach(property => {
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

      const hasImages = (property as any).hasImages === true;

      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = 'padding: 12px; min-width: 200px; max-width: 300px;';
      
      const titleEl = document.createElement('h3');
      titleEl.style.cssText = 'margin: 0 0 8px; font-size: 14px; font-weight: bold;';
      titleEl.textContent = `Propiedad: ${property.propertyId}`;
      contentDiv.appendChild(titleEl);
      
      const imgContainer = document.createElement('div');
      imgContainer.style.cssText = 'margin: 8px 0; min-height: 150px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center;';
      imgContainer.innerHTML = hasImages 
        ? '<span style="color: #666; font-size: 12px;">Cargando imagen...</span>'
        : '<span style="color: #999; font-size: 12px;">Sin imagen</span>';
      contentDiv.appendChild(imgContainer);
      
      const typeEl = document.createElement('p');
      typeEl.style.cssText = 'margin: 0 0 6px; font-size: 12px;';
      typeEl.textContent = `Tipo: ${
        property.propertyType === 'house' ? 'Casa' :
        property.propertyType === 'land' ? 'Terreno' :
        'Local Comercial'
      }`;
      contentDiv.appendChild(typeEl);
      
      const phoneEl = document.createElement('p');
      phoneEl.style.cssText = 'margin: 6px 0; font-size: 12px;';
      phoneEl.textContent = `Teléfono: ${property.signPhoneNumber || 'No disponible'}`;
      contentDiv.appendChild(phoneEl);

      const infoWindow = new google.maps.InfoWindow({
        content: contentDiv,
        maxWidth: 300
      });

      let imagesLoaded = false;

      marker.addListener('click', async () => {
        infoWindowsRef.current.forEach(window => window.close());
        infoWindow.open(map.current, marker);
        
        if (hasImages && !imagesLoaded) {
          try {
            const response = await fetch(`/api/admin/properties/${property.propertyId}/images`, {
              credentials: 'include'
            });
            if (response.ok) {
              const data = await response.json();
              if (data.images && data.images.length > 0) {
                imagesLoaded = true;
                const img = document.createElement('img');
                img.alt = 'Imagen de la propiedad';
                img.style.cssText = 'width: 100%; height: 150px; object-fit: cover; border-radius: 4px;';
                img.onload = () => {
                  imgContainer.innerHTML = '';
                  imgContainer.style.background = 'transparent';
                  imgContainer.appendChild(img);
                };
                img.onerror = () => {
                  imgContainer.innerHTML = '<span style="color: #999; font-size: 12px;">Error al cargar imagen</span>';
                };
                img.src = data.images[0];
              }
            }
          } catch (error) {
            imgContainer.innerHTML = '<span style="color: #999; font-size: 12px;">Error al cargar imagen</span>';
          }
        }
      });

      bounds.extend(marker.getPosition()!);
      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
    });

    if (propertiesToDisplay.length > 0) {
      map.current.fitBounds(bounds);
    }
  }, [cleanupMap, toast]);

  useImperativeHandle(ref, () => ({
    resizeMap: () => {
      if (map.current) {
        const center = map.current.getCenter();
        google.maps.event.trigger(map.current, 'resize');
        if (center) map.current.setCenter(center);
      }
    },
    searchProperty: (propertyId: string) => {
      if (!propertyId) {
        addMarkers(properties); // Show all if search is cleared
        return;
      }
      const foundProperty = properties.find(p => p.propertyId === propertyId);
      if (foundProperty) {
        // Clear existing markers first
        cleanupMap();

        // Center map on the found property with higher zoom
        map.current?.setCenter({ lat: foundProperty.location.lat, lng: foundProperty.location.lng });
        map.current?.setZoom(18);

        // Create a special blinking marker for the found property
        const blinkingMarker = new google.maps.Marker({
          position: { lat: foundProperty.location.lat, lng: foundProperty.location.lng },
          map: map.current,
          title: foundProperty.propertyId,
          optimized: false,
          animation: google.maps.Animation.BOUNCE,
          icon: {
            path: 'M12 0C7.802 0 4 3.403 4 7.602C4 11.8 7.469 16.812 12 24C16.531 16.812 20 11.8 20 7.602C20 3.403 16.199 0 12 0ZM12 11C10.343 11 9 9.657 9 8C9 6.343 10.343 5 12 5C13.657 5 15 6.343 15 8C15 9.657 13.657 11 12 11Z',
            fillColor: '#FFD700', // Gold color for special marker
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FF0000', // Red border
            scale: 2, // Larger size
            anchor: new google.maps.Point(12, 24),
          }
        });

        // Stop bouncing after 3 seconds and add blinking effect
        setTimeout(() => {
          blinkingMarker.setAnimation(null);

          // Create blinking effect
          let isVisible = true;
          const blinkInterval = setInterval(() => {
            blinkingMarker.setVisible(isVisible);
            isVisible = !isVisible;
          }, 500);

          // Stop blinking after 10 seconds
          setTimeout(() => {
            clearInterval(blinkInterval);
            blinkingMarker.setVisible(true);
          }, 10000);
        }, 3000);

        const propertyImage = Array.isArray(foundProperty.images) && foundProperty.images.length > 0
          ? foundProperty.images[0]
          : null;

        // Enhanced info window with larger image and more details
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 16px; min-width: 280px; max-width: 350px; font-family: Arial, sans-serif;">
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <div style="width: 12px; height: 12px; background: #FFD700; border-radius: 50%; margin-right: 8px; animation: pulse 1.5s infinite;"></div>
                <h3 style="margin: 0; font-size: 16px; font-weight: bold; color: #F05023;">
                  🎯 Propiedad Encontrada: ${foundProperty.propertyId}
                </h3>
              </div>
              ${propertyImage ? `
                <div style="margin: 12px 0; text-align: center;">
                  <img src="${propertyImage}"
                       alt="Imagen de la propiedad ${foundProperty.propertyId}"
                       style="width: 100%; max-width: 280px; height: 180px; object-fit: cover; border-radius: 8px; border: 2px solid #F05023; box-shadow: 0 4px 8px rgba(0,0,0,0.2);"
                       onclick="window.open('${propertyImage}', '_blank')"
                       title="Click para ver en tamaño completo"
                  />
                  <p style="margin: 4px 0 0 0; font-size: 10px; color: #666; cursor: pointer;" onclick="window.open('${propertyImage}', '_blank')">
                    📸 Click en la imagen para ampliar
                  </p>
                </div>
              ` : `
                <div style="margin: 12px 0; text-align: center; padding: 40px; background: #f5f5f5; border-radius: 8px; border: 2px dashed #ccc;">
                  <span style="font-size: 24px;">🏠</span>
                  <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">Sin imagen disponible</p>
                </div>
              `}
              <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin: 12px 0;">
                <p style="margin: 0 0 8px; font-size: 13px; color: #333;">
                  <strong>🏷️ Tipo:</strong> ${
                    foundProperty.propertyType === 'house' ? '🏠 Casa' :
                    foundProperty.propertyType === 'land' ? '🌿 Terreno' :
                    '🏢 Local Comercial'
                  }
                </p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #333;">
                  <strong>👤 Usuario:</strong> <span style="${foundProperty.user.isDeleted ? 'color: red; text-decoration: line-through;' : ''}">${foundProperty.user.fullName || foundProperty.user.username}${foundProperty.user.isDeleted ? ' (eliminado)' : ''}</span>
                </p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #333;">
                  <strong>📞 Teléfono:</strong> ${foundProperty.signPhoneNumber || 'No disponible'}
                </p>
                <p style="margin: 0; font-size: 12px; color: #666;">
                  <strong>📍 Coordenadas:</strong> ${foundProperty.location.lat.toFixed(6)}, ${foundProperty.location.lng.toFixed(6)}
                </p>
              </div>
              <style>
                @keyframes pulse {
                  0% { opacity: 1; }
                  50% { opacity: 0.5; }
                  100% { opacity: 1; }
                }
              </style>
            </div>
          `,
          maxWidth: 380
        });

        // Open info window immediately
        infoWindow.open(map.current, blinkingMarker);

        // Add click listener to the marker
        blinkingMarker.addListener('click', () => {
          infoWindowsRef.current.forEach(window => window.close());
          infoWindow.open(map.current, blinkingMarker);
        });

        markersRef.current.push(blinkingMarker);
        infoWindowsRef.current.push(infoWindow);

        toast({
          title: "¡Propiedad encontrada!",
          description: `Se ha localizado la propiedad ${propertyId} en el mapa`,
        });
      } else {
        toast({
          title: "Propiedad no encontrada",
          description: `No se encontró ninguna propiedad con el ID: ${propertyId}`,
          variant: "destructive"
        });
      }
    }
  }));


  // Obtener API key desde el servidor (funciona en Railway/Docker donde VITE_* no se inyecta en build)
  useEffect(() => {
    fetch("/api/config", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setApiKey(data.googleMapsApiKey || ""))
      .catch(() => setApiKey(""));
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    let isMounted = true;
    let onResize: (() => void) | undefined;
    let onOrientationChange: (() => void) | undefined;

    const initMap = async () => {
      if (!mapRef.current) {
        setIsLoading(false);
        return;
      }

      if (!apiKey) {
        setIsLoading(false);
        return;
      }

      if (!properties.length) {
        setIsLoading(false);
        return;
      }

      try {
        const loader = new Loader({
          apiKey,
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

        map.current = new google.maps.Map(mapRef.current, mapOptions);

        addMarkers(properties);

        // En móvil: redibujar al rotar o cambiar tamaño (orientationchange/resize)
        onResize = () => {
          if (map.current) {
            const center = map.current.getCenter();
            google.maps.event.trigger(map.current, 'resize');
            if (center) map.current.setCenter(center);
          }
        };
        onOrientationChange = () => setTimeout(onResize, 400);
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onOrientationChange);

        if (isMounted) {
          setIsLoading(false);
        }

      } catch (error) {
        console.error('Error loading map:', error);
        if (isMounted) {
          setMapError(String(error instanceof Error ? error.message : error));
          toast({
            title: "Error al cargar el mapa",
            description: "Revisá las restricciones de la API key en Google Cloud (ver instrucciones en pantalla)",
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
      if (typeof onResize === 'function') window.removeEventListener('resize', onResize);
      if (typeof onOrientationChange === 'function') window.removeEventListener('orientationchange', onOrientationChange);
    };
  }, [apiKey, properties, toast, cleanupMap, addMarkers]);

  const hasApiKey = !!apiKey;
  const hasProperties = properties.length > 0;

  if (!hasApiKey) {
    return (
      <div className="w-full h-[500px] flex flex-col items-center justify-center bg-gray-100 rounded-lg shadow-md p-6 text-center">
        <MapPin className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Mapa no disponible</h3>
        <p className="text-sm text-gray-600 max-w-md">
          Para ver el mapa necesitás configurar la API key de Google Maps.
          <br />Agregá <code className="bg-gray-200 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> en tu archivo <code className="bg-gray-200 px-1 rounded">.env</code> o en las variables de Railway.
        </p>
      </div>
    );
  }

  if (!hasProperties) {
    return (
      <div className="w-full h-[500px] flex flex-col items-center justify-center bg-gray-100 rounded-lg shadow-md p-6 text-center">
        <MapPin className="h-16 w-16 text-gray-400 mb-4" />
        <p className="text-gray-600">No hay propiedades para mostrar en el mapa</p>
      </div>
    );
  }

  if (mapError) {
    const isReferrerError = /referrer|RefererNotAllowed|restriction/i.test(mapError);
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const urlToAdd = currentOrigin ? `${currentOrigin}/*` : '(ej: https://tu-app.railway.app/*)';
    return (
      <div className="w-full h-[500px] flex flex-col items-center justify-center bg-white rounded-lg shadow-md p-6 text-center">
        <MapPin className="h-16 w-16 text-orange-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Error al cargar el mapa</h3>
        <p className="text-sm text-gray-700 mb-4 max-w-md">
          {isReferrerError
            ? "La API key de Google Maps no permite acceder desde este dispositivo. Agregá la URL actual a las restricciones."
            : "No se pudo cargar Google Maps. Revisá la consola del navegador para más detalles."}
        </p>
        {isReferrerError && (
          <div className="bg-gray-50 rounded-lg p-4 text-left text-sm text-gray-700 max-w-md space-y-2">
            <p className="font-medium">Solución (Google Cloud Console → Credenciales → tu API key):</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Editá tu API key de Maps</li>
              <li>En "Restricciones de sitios web" → HTTP referrers</li>
              <li>Agregá esta URL exacta: <code className="bg-gray-200 px-1 rounded block mt-1 break-all">{urlToAdd}</code></li>
              <li>En pruebas locales: <code className="bg-gray-200 px-1 rounded block mt-1">http://192.168.*.*/*</code></li>
              <li>En producción: <code className="bg-gray-200 px-1 rounded block mt-1">https://tu-dominio.railway.app/*</code></li>
            </ol>
          </div>
        )}
      </div>
    );
  }

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
}));

MapComponent.displayName = 'MapComponent';

function PropertyImagesViewer({ propertyId }: { propertyId: string }) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`/api/admin/properties/${propertyId}/images`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setImages(data.images || []);
        } else {
          setError('Error al cargar imágenes');
        }
      } catch (err) {
        setError('Error al cargar imágenes');
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 py-4">{error}</div>;
  }

  if (images.length === 0) {
    return <div className="text-center text-gray-500 py-4">No hay imágenes disponibles</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto">
      {images.map((img, idx) => (
        <img 
          key={idx} 
          src={img} 
          alt={`Foto ${idx + 1}`} 
          className="w-full rounded-lg shadow-md"
        />
      ))}
    </div>
  );
}

export default function AdminWebPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("map");
  const { toast } = useToast();

  const [searchPropertyId, setSearchPropertyId] = useState("");
  const mapComponentRef = useRef<any>(null);
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);

  // Redibujar el mapa cuando se vuelve a la pestaña Mapa (Google Maps no calcula dimensiones si el contenedor estuvo oculto)
  // 350ms en móvil suele necesitar más tiempo para que el contenedor sea visible
  useEffect(() => {
    if (activeTab === "map") {
      const t = setTimeout(() => mapComponentRef.current?.resizeMap?.(), 350);
      return () => clearTimeout(t);
    }
  }, [activeTab]);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageImageFile, setMessageImageFile] = useState<File | null>(null);
  const [messageImagePreview, setMessageImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);


  const { 
    data: properties = [], 
    isLoading: propertiesLoading, 
    isError: propertiesError,
    error: propertiesErrorDetail,
    refetch: refetchProperties 
  } = useQuery<PropertyWithUser[]>({
    queryKey: ['/api/admin/properties'],
    enabled: user?.isAdmin === true
  });

  const { data: unviewedCount = 0 } = useQuery<number>({
    queryKey: ['/api/admin/properties/unviewed-count'],
    queryFn: async () => {
      const res = await fetch('/api/admin/properties/unviewed-count', { credentials: 'include' });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count;
    },
    enabled: user?.isAdmin === true,
    refetchInterval: 30000,
  });

  const { data: users = [], refetch: refetchUsers } = useQuery<any[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.isSuperAdmin === true
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
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
      queryClient.invalidateQueries(['/api/admin/properties'])
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
      recipientId: null,
      imageUrl: null,
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
        description: "El mensaje ha sido enviado correctamente",
      });
      messageForm.reset();
      setMessageImageFile(null);
      setMessageImagePreview(null);
      setMessageDialogOpen(false);
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
      let imageUrl = null;
      
      if (messageImageFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('image', messageImageFile);
        
        const uploadResponse = await fetch('/api/upload/message-image', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Error al subir la imagen');
        }
        
        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.url;
        setIsUploadingImage(false);
      }
      
      await sendMessageMutation.mutateAsync({
        ...data,
        imageUrl,
      });
    } catch (error) {
      setIsUploadingImage(false);
      console.error('Error sending message:', error);
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMessageImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMessageImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const exportToSheetsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/export/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al exportar');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Exportación exitosa",
        description: `Se exportaron ${data.rowCount} propiedades a Google Sheets`,
      });
      if (data.spreadsheetUrl) {
        window.open(data.spreadsheetUrl, '_blank');
      }
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

  // Dummy unreadCount for now, as it's not related to the current changes
  const unreadCount = 0; 

  // Mark properties as viewed when switching to list tab
  useEffect(() => {
    if (activeTab === 'list' && user?.isAdmin && unviewedCount > 0) {
      fetch('/api/admin/properties/mark-viewed', {
        method: 'POST',
        credentials: 'include',
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/properties/unviewed-count'] });
      }).catch(() => {});
    }
  }, [activeTab, user?.isAdmin, unviewedCount]);

  // Query for weekly payments
  const { data: weeklyPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['/api/admin/payments/weekly'],
    enabled: user?.isAdmin === true && activeTab === 'payments',
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  return (
    <div style={{ minHeight: '100vh', width: '100vw', maxWidth: '100vw', display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }} className="bg-gray-100">
      <header style={{ width: '100vw', maxWidth: '100vw', backgroundColor: '#F05023', padding: '0.75rem 1rem', flexShrink: 0, margin: 0 }}>
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            className="text-white hover:text-white/80 p-0"
            onClick={() => setLocation("/dashboard")}
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
          <div className="flex-1 flex justify-center">
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
            <LogOut className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </div>
      </header>

      <main style={{ flex: 1, width: '100vw', maxWidth: '100vw', padding: '1rem', margin: 0, backgroundImage: 'url("/assets/ciudad.jpeg")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
        <div style={{ width: '100%', maxWidth: '100%' }} className="space-y-4 md:space-y-6">
          {/* Header: título + botones con fondo oscuro semitransparente */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 md:p-4 rounded-lg bg-[rgba(60,50,45,0.75)]">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white">Panel de Administración</h1>
            <div className="flex gap-2 md:gap-3 flex-wrap">
            <Button
              onClick={() => setLocation("/property/new")}
              size="sm"
              className="w-[140px] inline-flex items-center justify-center bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.25)] text-white border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Prop.
            </Button>
            {user.isSuperAdmin && (
              <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="w-[140px] inline-flex items-center justify-center bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.25)] text-white border-0"
                  >
                    <span className="inline-flex items-center">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Enviar Mensaje
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-white text-gray-900 [&_label]:text-gray-900">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900">Enviar Mensaje</DialogTitle>
                  </DialogHeader>
                  <Form {...messageForm}>
                    <form onSubmit={messageForm.handleSubmit(handleSendMessage)} className="space-y-4">
                      <FormField
                        control={messageForm.control}
                        name="recipientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destinatario</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(value === "all" ? null : parseInt(value))}
                              defaultValue="all"
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar destinatario" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white text-gray-900">
                                <SelectItem value="all">Todos los usuarios</SelectItem>
                                {users?.map((u) => (
                                  <SelectItem key={u.id} value={u.id.toString()}>
                                    {u.fullName || u.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={messageForm.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mensaje</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Escriba su mensaje aquí..."
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormItem>
                        <FormLabel>Imagen (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="cursor-pointer"
                          />
                        </FormControl>
                        {messageImagePreview && (
                          <div className="mt-2 relative">
                            <img 
                              src={messageImagePreview} 
                              alt="Vista previa" 
                              className="max-h-32 rounded-md object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1"
                              onClick={() => {
                                setMessageImageFile(null);
                                setMessageImagePreview(null);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </FormItem>
                      <DialogFooter>
                        <Button
                          type="submit"
                          disabled={sendMessageMutation.isPending || isUploadingImage}
                          className="min-w-[140px] transition-all duration-200 active:scale-95"
                        >
                          {(sendMessageMutation.isPending || isUploadingImage) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {isUploadingImage ? "Subiendo imagen..." : "Enviando..."}
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
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="w-[140px] inline-flex items-center justify-center bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.25)] text-white border-0"
                >
                  <span className="inline-flex items-center">
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartir App
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-[#F05023] border-[#E04015] [&>*]:bg-[#F05023] [&_button]:text-white [&_button]:hover:bg-white/20 [&_button]:border-white">
                <DialogHeader className="bg-[#F05023]">
                  <DialogTitle className="text-white">Compartir Virtual Agent</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4 p-4 bg-[#F05023]">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin)}`}
                    alt="Código QR de Virtual Agent"
                    className="w-64 h-64 bg-white rounded-lg p-2"
                  />
                  <p className="text-sm text-center text-white">
                    Escanea este código QR para acceder a Virtual Agent
                  </p>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin).then(() => {
                        toast({
                          title: "Enlace copiado",
                          description: "La URL ha sido copiada al portapapeles",
                        });
                      });
                    }}
                    variant="outline"
                    className="w-full border-white text-white hover:bg-white/20 hover:text-white"
                  >
                    Copiar Enlace
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4 mt-4">
            <Card className="bg-white shadow-sm rounded-xl border-0">
              <CardContent className="py-2 md:py-4">
                <p className="text-base md:text-lg font-medium text-gray-800">Casas</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{propertyCounts.house}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm rounded-xl border-0">
              <CardContent className="py-2 md:py-4">
                <p className="text-base md:text-lg font-medium text-gray-800">Terrenos</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{propertyCounts.land}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm rounded-xl border-0">
              <CardContent className="py-2 md:py-4">
                <p className="text-base md:text-lg font-medium text-gray-800">Comercial</p>
                <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{propertyCounts.commercial}</p>
              </CardContent>
            </Card>
            <Card className="bg-white shadow-sm rounded-xl border-0 hidden lg:block">
              <CardContent className="py-4">
                <p className="text-lg font-medium text-gray-800">Total</p>
                <p className="text-4xl font-bold text-gray-900">{properties.length}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`w-full grid ${user.isSuperAdmin ? 'grid-cols-4' : 'grid-cols-2'} h-12 md:h-14 bg-[#FF6347] p-0 gap-0 rounded-none border-b-2 border-[#ff7a5c]`}>
              <TabsTrigger value="map" className="text-sm md:text-base text-white data-[state=active]:bg-[#ff7a5c] data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-800 rounded-none border-b-2 border-transparent data-[state=inactive]:bg-transparent">
                <MapPin className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Mapa
              </TabsTrigger>
              <TabsTrigger value="list" className="text-sm md:text-base text-white data-[state=active]:bg-[#ff7a5c] data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-800 rounded-none border-b-2 border-transparent data-[state=inactive]:bg-transparent relative">
                <List className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                Lista
                {unviewedCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center text-xs px-1">
                    {unviewedCount > 99 ? '99+' : unviewedCount}
                  </Badge>
                )}
              </TabsTrigger>
              {user.isSuperAdmin && (
                <TabsTrigger value="users" className="text-sm md:text-base text-white data-[state=active]:bg-[#ff7a5c] data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-800 rounded-none border-b-2 border-transparent data-[state=inactive]:bg-transparent">
                  <Users className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Roles
                </TabsTrigger>
              )}
              {user.isSuperAdmin && (
                <TabsTrigger value="payments" className="text-sm md:text-base text-white data-[state=active]:bg-[#ff7a5c] data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-800 rounded-none border-b-2 border-transparent data-[state=inactive]:bg-transparent">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  ₡ Pagos
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="map">
              <Card className="bg-white border-0 shadow-md">
                <CardContent className="p-4 md:p-6 space-y-4">
                  <div className="flex gap-2 w-full md:max-w-md">
                    <input
                      type="text"
                      placeholder="Buscar por ID de propiedad..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 text-sm md:text-base"
                      value={searchPropertyId}
                      onChange={(e) => setSearchPropertyId(e.target.value)}
                    />
                    <Button 
                      onClick={() => {
                        if (mapComponentRef.current) {
                          mapComponentRef.current.searchProperty(searchPropertyId);
                        }
                      }}
                      size="sm"
                      disabled={!searchPropertyId.trim()}
                      className="bg-[#FF6347] hover:bg-[#ff7a5c] text-white border-0 rounded-lg"
                    >
                      Buscar
                    </Button>
                  </div>

                  <div className="w-full h-[400px] md:h-[500px] lg:h-[600px]">
                    <MapComponent 
                      ref={mapComponentRef}
                      properties={properties} 
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <div className="overflow-x-auto bg-white rounded-lg shadow-lg p-4 md:p-6">
                {user.isSuperAdmin && (
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={() => exportToSheetsMutation.mutate()}
                      disabled={exportToSheetsMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {exportToSheetsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Exportando...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Exportar a Google Sheets
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {propertiesLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-[#F05023] mb-4" />
                    <p className="text-gray-600">Cargando propiedades...</p>
                  </div>
                ) : propertiesError ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-red-600 font-medium mb-2">Error al cargar las propiedades</p>
                    <p className="text-sm text-gray-600 mb-4 max-w-md">
                      {(propertiesErrorDetail as { message?: string })?.message || 
                        'No se pudo conectar con el servidor. Verificá tu sesión e intentá de nuevo.'}
                    </p>
                    <Button onClick={() => refetchProperties()} variant="outline" className="text-[#F05023] border-[#F05023] hover:bg-[#F05023]/10">
                      Reintentar
                    </Button>
                  </div>
                ) : properties.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-gray-600 font-medium mb-2">No hay propiedades registradas</p>
                    <p className="text-sm text-gray-500 mb-4">Usá "Agregar Prop." para registrar la primera propiedad.</p>
                    <Button onClick={() => setLocation("/property/new")} className="bg-[#F05023] hover:bg-[#E04015]">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Propiedad
                    </Button>
                  </div>
                ) : (
                <Table className="[&_th]:bg-white [&_th]:text-gray-800 [&_td]:bg-white [&_td]:text-gray-900">
                  <TableHeader>
                    <TableRow className="border-gray-200 hover:bg-gray-50">
                      <TableHead className="w-20 md:w-28 text-gray-800">ID</TableHead>
                      <TableHead className="md:w-32 text-gray-800">Tipo</TableHead>
                      <TableHead className="hidden sm:table-cell md:w-48 text-gray-800">Usuario</TableHead>
                      <TableHead className="hidden sm:table-cell md:w-40 text-gray-800">Teléfono</TableHead>
                      <TableHead className="hidden lg:table-cell text-gray-800">Ubicación</TableHead>
                      <TableHead className="hidden md:table-cell w-14 pl-1 text-gray-800">Foto</TableHead>
                      <TableHead className="w-[140px] md:w-[180px] text-gray-800">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.propertyId} className="bg-white hover:bg-gray-50 border-gray-200">
                        <TableCell className="font-medium">
                          <button
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                            onClick={() => {
                              setSearchPropertyId(property.propertyId);
                              setActiveTab("map");
                              // Small delay to ensure tab change happens first
                              setTimeout(() => {
                                if (mapComponentRef.current) {
                                  mapComponentRef.current.searchProperty(property.propertyId);
                                }
                              }, 100);
                            }}
                            title="Haz clic para ver en el mapa"
                          >
                            {property.propertyId}
                          </button>
                        </TableCell>
                        <TableCell>
                          {property.propertyType === 'house' ? 'Casa' :
                            property.propertyType === 'land' ? 'Terreno' :
                              'Comercial'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={property.user.isDeleted ? "text-red-500 line-through" : ""}>
                            {property.user.fullName || property.user.username}
                            {property.user.isDeleted && " (eliminado)"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {property.signPhoneNumber || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {property.location.lat.toFixed(4)}, {property.location.lng.toFixed(4)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell pl-1">
                          {(property as any).hasImages ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <button className="text-blue-600 hover:text-blue-800 hover:underline text-base font-bold cursor-pointer">
                                  Ver
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl bg-app-surface border-app-surface-border [&>*]:bg-app-surface [&_button]:text-gray-900 [&_button]:hover:bg-app-surface-hover">
                                <DialogHeader className="bg-app-surface">
                                  <DialogTitle className="text-gray-900">Fotos de la Propiedad {property.propertyId}</DialogTitle>
                                </DialogHeader>
                                <div className="bg-white rounded-lg p-4">
                                  <PropertyImagesViewer propertyId={property.propertyId} />
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Detalles
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="w-[90vw] max-w-lg bg-app-surface border-app-surface-border [&>*]:bg-app-surface [&_button]:text-gray-900 [&_button]:hover:bg-app-surface-hover">
                                <DialogHeader className="bg-app-surface">
                                  <DialogTitle className="text-gray-900">Detalles de la Propiedad</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 bg-app-surface text-gray-900">
                                  <div className="sm:hidden">
                                    <p><strong>Usuario:</strong> <span className={property.user.isDeleted ? "text-red-500 line-through" : ""}>{property.user.fullName || property.user.username}{property.user.isDeleted && " (eliminado)"}</span></p>
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
                )}
              </div>
            </TabsContent>

            <TabsContent value="users">
                <div className="space-y-4">
                  <Card className="bg-white border-0 shadow-md">
                    <CardContent className="pt-6 bg-white">
                      <div className="overflow-x-auto -mx-6 bg-white">
                        <div className="inline-block min-w-full align-middle">
                          <Table className="[&_th]:bg-white [&_th]:text-gray-800 [&_td]:bg-white [&_td]:text-gray-900">
                            <TableHeader>
                              <TableRow className="bg-white border-gray-200 hover:bg-gray-50">
                                <TableHead className="w-40 text-gray-800">Usuario</TableHead>
                                <TableHead className="w-32">Rol</TableHead>
                                <TableHead className="w-24 text-right">Admin</TableHead>
                                <TableHead className="w-20 text-right pr-6">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {users.map((adminUser) => (
                                <TableRow key={adminUser.id} className="bg-white hover:bg-gray-50 border-gray-200">
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

            <TabsContent value="payments">
            <Card className="bg-white border-0 shadow-md">
              <CardHeader className="bg-white">
                <CardTitle className="text-gray-900">Pagos Semanales</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Los usuarios reciben ₡250 por cada propiedad registrada durante la semana actual.
                </p>
              </CardHeader>
              <CardContent className="bg-white">
                <div className="overflow-x-auto bg-white rounded-lg shadow-sm p-4">
                  {paymentsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="mt-2">Calculando pagos...</p>
                    </div>
                  ) : weeklyPayments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay pagos pendientes esta semana.</p>
                      <p className="text-sm">Los usuarios que registren propiedades aparecerán aquí. Los administradores no reciben pagos.</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="font-semibold text-green-800 mb-2">Resumen de Pagos de Esta Semana</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {weeklyPayments.length}
                            </p>
                            <p className="text-sm text-green-700">Usuarios a Pagar</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {weeklyPayments.reduce((sum, payment) => sum + payment.propertiesCount, 0)}
                            </p>
                            <p className="text-sm text-green-700">Propiedades Registradas</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              ₡{weeklyPayments.reduce((sum, payment) => sum + payment.totalPayment, 0).toLocaleString()}
                            </p>
                            <p className="text-sm text-green-700">Total a Pagar</p>
                          </div>
                        </div>
                      </div>

                      <Table className="[&_th]:bg-white [&_th]:text-gray-800 [&_td]:bg-white [&_td]:text-gray-900">
                        <TableHeader>
                          <TableRow className="bg-white border-gray-200 hover:bg-gray-50">
                            <TableHead className="text-gray-800">Usuario</TableHead>
                            <TableHead>Nombre Completo</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead className="text-center">Propiedades</TableHead>
                            <TableHead className="text-right">Pago Total</TableHead>
                            <TableHead className="text-center">Período</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {weeklyPayments.map((payment) => {
                            const weekStart = new Date(payment.weekStart);
                            const weekEnd = new Date(payment.weekEnd);

                            return (
                              <TableRow key={payment.userId} className="bg-white hover:bg-gray-50 border-gray-200">
                                <TableCell className="font-medium">
                                  {payment.user.username}
                                </TableCell>
                                <TableCell>
                                  {payment.user.fullName || '-'}
                                </TableCell>
                                <TableCell>
                                  {payment.user.mobile || '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {payment.propertiesCount} {payment.propertiesCount === 1 ? 'propiedad' : 'propiedades'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right font-semibold text-green-600">
                                  ₡{payment.totalPayment.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center text-sm text-muted-foreground">
                                  {weekStart.toLocaleDateString('es-CR', { 
                                    day: 'numeric', 
                                    month: 'short' 
                                  })} - {weekEnd.toLocaleDateString('es-CR', { 
                                    day: 'numeric', 
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>Nota:</strong> Los pagos se calculan automáticamente cada semana (Lun–Dom, zona Costa Rica). 
                          Cada propiedad registrada vale ₡250 colones. Solo usuarios normales (no administradores) reciben pagos.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="messages">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Centro de Mensajes</CardTitle>
                  <Button
                    onClick={() => setShowNewMessageForm(!showNewMessageForm)}
                    size="sm"
                    className="bg-[#F05023] hover:bg-[#E04015]"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {showNewMessageForm ? "Cancelar" : "Nuevo Mensaje"}
                  </Button>
                </div>
              </CardHeader>
              {showNewMessageForm && (
                <CardContent>
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
                      <Button type="submit" disabled={sendMessageMutation.isPending} className="bg-[#F05023] hover:bg-[#E04015]">
                        {sendMessageMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          "Enviar Mensaje"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              )}
            </Card>
          </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}