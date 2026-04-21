import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PropertyWithUser, insertMessageSchema, InsertMessage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin, Image as ImageIcon, ChevronLeft, Users, Plus, Trash2, MessageCircle, Loader2, DollarSign, MessageSquare, Share2, FileSpreadsheet, Bell, Activity, Terminal, CheckCircle2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useEffect, useState, useRef, memo, useCallback, forwardRef, useImperativeHandle, useMemo } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { queryClient } from "@/lib/queryClient";
import { OptimizedImage } from "@/components/optimized-image";
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
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const highlightCircleRef = useRef<google.maps.Circle | null>(null);
  const pulseIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track whether a user has zoomed to a specific property — prevents fitBounds from resetting zoom
  const searchActiveRef = useRef<boolean>(false);
  const { toast } = useToast();

  // Cleanup function to remove markers and listeners
  const cleanupMap = useCallback(() => {
    if (highlightCircleRef.current) {
      highlightCircleRef.current.setMap(null);
      highlightCircleRef.current = null;
    }
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }

    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

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
      const lat = Number(property.location?.lat || 0);
      const lng = Number(property.location?.lng || 0);
      
      const marker = new google.maps.Marker({
        position: { lat, lng },
        map: map.current,
        title: property.propertyId,
        optimized: false,
        icon: property.tieneContrato ? {
          path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
          fillColor: property.propertyType === 'house' ? '#F05023' :
                    property.propertyType === 'land' ? '#22C55E' : '#3B82F6',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
          scale: 1.5,
          anchor: new google.maps.Point(12, 12),
        } : {
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

      const locEl = document.createElement('p');
      locEl.style.cssText = 'margin: 6px 0; font-size: 11px; color: #666;';
      const isCorrupted = property.location?.address?.includes('[REVISIÓN REQUERIDA]');
      locEl.innerHTML = `<strong>📍 Coord:</strong> ${property.location?.lat?.toFixed(7) || '0'}, ${property.location?.lng?.toFixed(7) || '0'}${isCorrupted ? '<br/><span style="color:red;font-weight:bold;">⚠️ REVISIÓN REQUERIDA</span>' : ''}`;
      contentDiv.appendChild(locEl);

      const wasiEl = document.createElement('div');
      wasiEl.style.cssText = 'margin-top: 10px; padding-top: 10px; border-top: 1px solid #ccc;';
      if (property.tieneContrato && property.wasiId) {
        wasiEl.innerHTML = `
          <div style="font-size: 11px; color: #666; margin-bottom: 5px;">
            <strong style="color: #FFD700; font-size: 14px;">★</strong> <strong>Firmado en WASI ID:</strong> ${property.wasiId}
          </div>
          <button id="wasi-btn-${property.id}" style="width: 100%; padding: 6px; background: #FFD700; border: 1px solid #d4af37; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; color: #555;">
            Cargar Detalles de CRM
          </button>
          <div id="wasi-data-${property.id}" style="display: none; font-size: 11px; background: #fff8e1; border: 1px solid #ffe082; padding: 8px; border-radius: 4px; margin-top: 6px;"></div>
        `;
      } else {
        wasiEl.innerHTML = `
          <div style="font-size: 11px; margin-bottom: 5px; font-weight: bold; color: #F05023;">Vincular con WASI:</div>
          <div style="display: flex; gap: 4px;">
            <input type="text" id="wasi-input-${property.id}" placeholder="ID de WASI" style="flex: 1; padding: 4px; font-size: 11px; border: 1px solid #ccc; border-radius: 4px; outline: none;" />
            <button id="wasi-btn-${property.id}" style="padding: 4px 8px; background: #F05023; color: white; border: none; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: bold;">
              Vincular
            </button>
          </div>
        `;
      }
      contentDiv.appendChild(wasiEl);

      const deleteSection = document.createElement('div');
      deleteSection.style.cssText = 'margin-top: 10px; padding-top: 10px; border-top: 1px solid #ffcccc; text-align: center;';
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️ Borrar Propiedad';
      deleteBtn.style.cssText = 'width: 100%; padding: 6px; background: #fee2e2; border: 1px solid #ef4444; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; color: #ef4444; transition: all 0.2s ease;';
      deleteBtn.addEventListener('click', async () => {
        if (window.confirm(`ESTÁS A PUNTO DE BORRAR LA PROPIEDAD (CÓDIGO: ${property.propertyId}).\n¿Estás seguro de que deseas continuar?`)) {
          deleteBtn.textContent = 'Borrando...';
          deleteBtn.disabled = true;
          try {
            const res = await fetch(`/api/admin/properties/${property.propertyId}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
              toast({ title: 'Éxito', description: 'Propiedad borrada correctamente.' });
              infoWindow.close();
              queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
              setTimeout(() => { window.location.reload(); }, 1000);
            } else {
              toast({ title: 'Error', description: 'No se pudo borrar', variant: 'destructive' });
              deleteBtn.textContent = '🗑️ Borrar Propiedad';
              deleteBtn.disabled = false;
            }
          } catch(e) {
            toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' });
            deleteBtn.textContent = '🗑️ Borrar Propiedad';
            deleteBtn.disabled = false;
          }
        }
      });
      deleteSection.appendChild(deleteBtn);
      contentDiv.appendChild(deleteSection);

      const infoWindow = new google.maps.InfoWindow({
        content: contentDiv,
        maxWidth: 300
      });

      let imagesLoaded = false;

      // WASI Event Listeners binding
      google.maps.event.addListener(infoWindow, 'domready', () => {
        const btn = document.getElementById(`wasi-btn-${property.id}`);
        if (!btn) return;
        
        // Remove existing listeners to prevent duplicates
        const newBtn = btn.cloneNode(true);
        btn.parentNode?.replaceChild(newBtn, btn);
        
        if (property.tieneContrato) {
          newBtn.addEventListener('click', async () => {
             const dataDiv = document.getElementById(`wasi-data-${property.id}`);
             if (dataDiv) {
               dataDiv.style.display = 'block';
               dataDiv.innerHTML = '<div style="text-align: center;"><span class="text-xs text-gray-500">Buscando...</span></div>';
               try {
                 const res = await fetch(`/api/admin/properties/${property.propertyId}/wasi`, { credentials: 'include' });
                 if (res.ok) {
                   const data = await res.json();
                                       dataDiv.innerHTML = `
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">
                        <div><strong>Precio Venta:</strong><br/>${data.sale_price_label || 'N/A'}</div>
                        <div><strong>Precio Alq:</strong><br/>${data.rent_price_label || 'N/A'}</div>
                        <div><strong>Área Total:</strong><br/>${data.area ? data.area + ' m²' : 'N/A'}</div>
                        <div><strong>Área Const:</strong><br/>${data.built_area ? data.built_area + ' m²' : 'N/A'}</div>
                        <div><strong>Año Const:</strong><br/>${data.building_date || 'N/A'}</div>
                        <div><strong>Condición:</strong><br/>${data.property_condition_label || 'N/A'}</div>
                        ${data.bedrooms ? `<div><strong>Dormitorios:</strong><br/>${data.bedrooms}</div>` : ''}
                        ${data.bathrooms ? `<div><strong>Baños:</strong><br/>${data.bathrooms}</div>` : ''}
                        ${data.garages ? `<div><strong>Garages:</strong><br/>${data.garages}</div>` : ''}
                      </div>
                      <div style="margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 5px; font-size: 11px;">
                        ${data.city_label ? `<strong>📍Ubicación:</strong> ${data.city_label}${data.region_label ? ', ' + data.region_label : ''}` : ''}
                      </div>
                    `;
                 } else {
                   dataDiv.innerHTML = '<span style="color:red; font-weight:bold;">Error al obtener datos. ¿Token inválido?</span>';
                 }
               } catch (e) {
                 dataDiv.innerHTML = '<span style="color:red; font-weight:bold;">Error de red.</span>';
               }
             }
          });
        } else {
          newBtn.addEventListener('click', async () => {
             const input = document.getElementById(`wasi-input-${property.id}`) as HTMLInputElement;
             if (!input?.value) return alert('Debes ingresar un ID de WASI válido');
             
             newBtn.textContent = '...';
             try {
                 const res = await fetch(`/api/admin/properties/${property.propertyId}/link-wasi`, { 
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ wasiId: input.value }),
                   credentials: 'include' 
                 });
                 if (res.ok) {
                   toast({ title: "¡Vinculación Exitosa!", description: "La propiedad se ha vinculado a WASI de forma permanente." });
                   (newBtn as HTMLButtonElement).textContent = "¡OK!";
                   (newBtn as HTMLButtonElement).style.background = "#22C55E";
                   setTimeout(() => {
                     window.location.reload();
                   }, 1000);
                 } else {
                   const err = await res.json();
                   alert('Error: ' + err.message);
                   (newBtn as HTMLButtonElement).textContent = "Vincular";
                 }
             } catch (e) {
                alert('Error de conexión con el servidor.');
                (newBtn as HTMLButtonElement).textContent = "Vincular";
             }
          });
        }
      });

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
              // Use thumbnail for the small info window
              const displayImg = (data.thumbnails && data.thumbnails[0]) || (data.images && data.images[0]);
              
              if (displayImg) {
                imagesLoaded = true;
                const img = document.createElement('img');
                img.alt = 'Imagen de la propiedad';
                img.style.cssText = 'width: 100%; height: 150px; object-fit: cover; border-radius: 4px;';
                img.onload = () => {
                  imgContainer.innerHTML = '';
                  imgContainer.style.background = 'transparent';
                  imgContainer.appendChild(img);
                };
                img.src = displayImg;
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

      // GeoAudit Log
      console.log(`[Virtual Agent GeoAudit] Property ${property.propertyId}: Saved (${lat}, ${lng}) -> Rendered (${marker.getPosition()?.lat()}, ${marker.getPosition()?.lng()})`);
    });

    if (markersRef.current.length > 0 && map.current) {
      clustererRef.current = new MarkerClusterer({
        map: map.current,
        markers: markersRef.current
      });
    }

    // Only fit bounds if no specific property search is active
    if (propertiesToDisplay.length > 0 && !searchActiveRef.current) {
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
      if (highlightCircleRef.current) {
        highlightCircleRef.current.setMap(null);
        highlightCircleRef.current = null;
      }
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
        pulseIntervalRef.current = null;
      }

      if (!propertyId) {
        searchActiveRef.current = false;
        infoWindowsRef.current.forEach(window => window.close());
        const bounds = new google.maps.LatLngBounds();
        markersRef.current.forEach(m => {
          if (m.getPosition()) bounds.extend(m.getPosition()!);
        });
        if (markersRef.current.length > 0 && map.current) {
             map.current.fitBounds(bounds);
        }
        return;
      }
      const foundProperty = properties.find(p => p.propertyId === propertyId);
      if (foundProperty) {
        // Mark search as active — this prevents fitBounds from resetting the zoom
        searchActiveRef.current = true;

        if (map.current) {
             google.maps.event.trigger(map.current, 'resize');
        }

        const lat = Number(foundProperty.location?.lat || 0);
        const lng = Number(foundProperty.location?.lng || 0);

        // Zoom first so the tile load starts immediately, then pan to center
        map.current?.setZoom(18);
        map.current?.panTo({ lat, lng });

        const highlightCircle = new google.maps.Circle({
          strokeColor: '#FFFF00',
          strokeOpacity: 1.0,
          strokeWeight: 3,
          fillColor: '#FFFF00',
          fillOpacity: 0.4,
          map: map.current,
          center: { lat, lng },
          radius: 20,
          zIndex: 99999
        });
        
        highlightCircleRef.current = highlightCircle;

        let isPulsing = true;
        let scaleUp = true;
        
        pulseIntervalRef.current = setInterval(() => {
           if (!isPulsing) return;
           const currentRadius = highlightCircle.getRadius();
           if (scaleUp) {
               highlightCircle.setRadius(currentRadius + 1);
               if (currentRadius > 25) scaleUp = false;
           } else {
               highlightCircle.setRadius(currentRadius - 1);
               if (currentRadius < 15) scaleUp = true;
           }
        }, 50);

        setTimeout(() => {
           isPulsing = false;
           if (pulseIntervalRef.current) {
               clearInterval(pulseIntervalRef.current);
               pulseIntervalRef.current = null;
           }
           if (highlightCircle) highlightCircle.setRadius(20);
        }, 3000);

        const propertyImage = (foundProperty.thumbnails && foundProperty.thumbnails.length > 0)
          ? foundProperty.thumbnails[0]
          : (foundProperty.images && (foundProperty.images as any).length > 0 ? (foundProperty.images[0] as string) : null);

        const fullImage = (foundProperty.images && (foundProperty.images as any).length > 0) ? (foundProperty.images[0] as string) : null;

        const infoWindowDiv = document.createElement('div');
        infoWindowDiv.innerHTML = `
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
                       onclick="window.open('${fullImage}', '_blank')"
                       title="Click para ver en tamaño completo"
                       loading="lazy"
                  />
                  <p style="margin: 4px 0 0 0; font-size: 10px; color: #666; cursor: pointer;" onclick="window.open('${fullImage}', '_blank')">
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
                  <strong>👤 Usuario:</strong> <span style="${foundProperty.user?.isDeleted ? 'color: red; text-decoration: line-through;' : ''}">${foundProperty.user?.fullName || foundProperty.user?.username || 'Usuario Desconocido'}${foundProperty.user?.isDeleted ? ' (eliminado)' : ''}</span>
                </p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #333;">
                  <strong>📞 Teléfono:</strong> ${foundProperty.signPhoneNumber || 'No disponible'}
                </p>
                <p style="margin: 0; font-size: 12px; color: #666;">
                  <strong>📍 Coordenadas:</strong> ${foundProperty.location?.lat?.toFixed(7) || '0'}, ${foundProperty.location?.lng?.toFixed(7) || '0'}
                </p>
                ${foundProperty.location?.address?.includes('[REVISIÓN REQUERIDA]') ? `
                  <p style="margin: 4px 0 0; font-size: 12px; color: #ef4444; font-weight: bold;">
                    ⚠️ REVISIÓN REQUERIDA (Ubicación corrupta)
                  </p>
                ` : ''}
              </div>
              <style>
                @keyframes pulse {
                  0% { opacity: 1; }
                  50% { opacity: 0.5; }
                  100% { opacity: 1; }
                }
              </style>
            </div>
          `;

        const deleteSection2 = document.createElement('div');
        deleteSection2.style.cssText = 'margin-top: 10px; padding-top: 10px; border-top: 1px solid #ffcccc; text-align: center;';
        const deleteBtn2 = document.createElement('button');
        deleteBtn2.textContent = '🗑️ Borrar Propiedad';
        deleteBtn2.style.cssText = 'width: 100%; padding: 6px; background: #fee2e2; border: 1px solid #ef4444; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; color: #ef4444; transition: all 0.2s ease;';
        deleteBtn2.addEventListener('click', async () => {
          if (window.confirm(`ESTÁS A PUNTO DE BORRAR LA PROPIEDAD (CÓDIGO: ${foundProperty.propertyId}).\n¿Estás seguro de que deseas continuar?`)) {
            deleteBtn2.textContent = 'Borrando...';
            deleteBtn2.disabled = true;
            try {
              const res = await fetch(`/api/admin/properties/${foundProperty.propertyId}`, { method: 'DELETE', credentials: 'include' });
              if (res.ok) {
                toast({ title: 'Éxito', description: 'Propiedad borrada correctamente.' });
                if (infoWindow) infoWindow.close();
                queryClient.invalidateQueries({ queryKey: ["/api/admin/properties"] });
                setTimeout(() => window.location.reload(), 1000);
              } else {
                toast({ title: 'Error', description: 'No se pudo borrar', variant: 'destructive' });
                deleteBtn2.textContent = '🗑️ Borrar Propiedad';
                deleteBtn2.disabled = false;
              }
            } catch(e) {
              toast({ title: 'Error', description: 'Error de red', variant: 'destructive' });
              deleteBtn2.textContent = '🗑️ Borrar Propiedad';
              deleteBtn2.disabled = false;
            }
          }
        });
        deleteSection2.appendChild(deleteBtn2);
        infoWindowDiv.firstElementChild?.appendChild(deleteSection2);

        const infoWindow = new google.maps.InfoWindow({
          content: infoWindowDiv,
          maxWidth: 380,
          disableAutoPan: true
        });

        infoWindowsRef.current.forEach(window => window.close());

        const existingMarker = markersRef.current.find(m => m.getTitle() === foundProperty.propertyId);

        if (existingMarker) {
             infoWindow.open(map.current, existingMarker);
             existingMarker.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);
        } else {
             infoWindow.setPosition({ lat, lng });
             infoWindow.open(map.current);
        }

        infoWindow.addListener('closeclick', () => {
           if (highlightCircleRef.current) {
             highlightCircleRef.current.setMap(null);
             highlightCircleRef.current = null;
           }
           if (pulseIntervalRef.current) {
             clearInterval(pulseIntervalRef.current);
             pulseIntervalRef.current = null;
           }
        });

        infoWindowsRef.current.push(infoWindow);

        console.log(`[Virtual Agent GeoAudit] Selected Property ${foundProperty.propertyId}: Saved (${lat}, ${lng})`);

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
    if (!apiKey || !properties.length) return;
    let isMounted = true;
    let onResize: (() => void) | undefined;
    let onOrientationChange: (() => void) | undefined;

    const initMap = async () => {
      if (!mapRef.current || !apiKey || !properties.length) {
        setIsLoading(false);
        return;
      }

      // If map is already initialized, just add markers (avoids re-loading the script)
      if (map.current) {
        addMarkers(properties);
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
        onOrientationChange = () => setTimeout(onResize!, 400);
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
      if (typeof onResize === 'function') window.removeEventListener('resize', onResize);
      if (typeof onOrientationChange === 'function') window.removeEventListener('orientationchange', onOrientationChange);
    };
  // Re-run when apiKey arrives OR when first batch of properties arrives
  }, [apiKey, properties.length, toast, cleanupMap, addMarkers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh markers when properties list changes WITHOUT resetting zoom/circle
  useEffect(() => {
    if (!map.current) return;
    addMarkers(properties);
  }, [properties, addMarkers]);

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
    <div className="w-full h-[500px] relative bg-gray-200 rounded-lg overflow-hidden shadow-md border-2 border-gray-300">
      {/* The map div must always be in the DOM so mapRef is valid when properties arrive */}
      <div
        ref={mapRef}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
      />
      {/* Overlay: loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {/* Overlay: no properties yet (shown while data is fetching) */}
      {!hasProperties && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/90">
          <MapPin className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-gray-600">No hay propiedades para mostrar en el mapa</p>
        </div>
      )}
    </div>
  );
}));

MapComponent.displayName = 'MapComponent';

function PropertyImagesViewer({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<{
    images: string[];
    thumbnails: string[];
    blurhashes: string[];
  }>({ images: [], thumbnails: [], blurhashes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`/api/admin/properties/${propertyId}/images`, {
          credentials: 'include'
        });
        if (response.ok) {
          const fetchedData = await response.json();
          setData({
            images: fetchedData.images || [],
            thumbnails: fetchedData.thumbnails || [],
            blurhashes: fetchedData.blurhashes || []
          });
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-[#F05023]" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 py-8">{error}</div>;
  }

  if (data.images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <ImageIcon className="h-16 w-16 mb-3 opacity-30" />
        <p>No hay imágenes disponibles</p>
      </div>
    );
  }

  const total = data.images.length;
  const prev = () => setCurrentIdx(i => (i - 1 + total) % total);
  const next = () => setCurrentIdx(i => (i + 1) % total);

  return (
    <div className="flex flex-col gap-3">
      {/* Imagen principal grande */}
      <div className="relative w-full bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '65vh' }}>
        <img
          src={data.images[currentIdx]}
          alt={`Foto ${currentIdx + 1} de ${total}`}
          className="w-full h-full object-contain"
          style={{ maxHeight: '65vh' }}
        />
        {/* Botón izquierda */}
        {total > 1 && (
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all shadow-lg"
            aria-label="Anterior"
          >
            ‹
          </button>
        )}
        {/* Botón derecha */}
        {total > 1 && (
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl transition-all shadow-lg"
            aria-label="Siguiente"
          >
            ›
          </button>
        )}
        {/* Contador */}
        <div className="absolute bottom-2 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {currentIdx + 1} / {total}
        </div>
        {/* Botón ver completa */}
        <button
          onClick={() => window.open(data.images[currentIdx], '_blank')}
          className="absolute bottom-2 left-3 bg-black/60 hover:bg-black/80 text-white text-xs px-3 py-1 rounded-full transition-all"
        >
          🔍 Ver en tamaño completo
        </button>
      </div>

      {/* Miniaturas */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 px-1">
          {data.images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentIdx ? 'border-[#F05023] scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-90'
              }`}
            >
              <img
                src={data.thumbnails?.[idx] || data.images[idx]}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── HEALTH MONITOR ──────────────────────────────────

type TestStatus = 'idle' | 'running' | 'ok' | 'fail';

interface TestCard {
  id: string;
  endpoint: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const HEALTH_TESTS: TestCard[] = [
  {
    id: 'capture',
    endpoint: 'test-capture-flow',
    label: 'Flujo de Captura',
    description: 'Datos técnicos completos, GPS, province, district',
    icon: '🏠',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-300',
  },
  {
    id: 'photo',
    endpoint: 'test-photo-upload',
    label: 'Subida de Fotos',
    description: 'Verificación de límite de peso (~500 KB)',
    icon: '📷',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
    borderColor: 'border-purple-300',
  },
  {
    id: 'wasi',
    endpoint: 'test-wasi',
    label: 'Conexión WASI',
    description: 'API real wasi.co — token, latencia, estructura',
    icon: '🔗',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    borderColor: 'border-orange-300',
  },
];

function DiagnosticCenter() {
  type LogEntry = { status: 'OK' | 'WAIT' | 'FAIL'; message: string; suggestion?: string; timestamp: string };
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [runningTest, setRunningTest] = useState<string | null>(null);
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});
  const logsEndRef = useRef<HTMLDivElement>(null);

  const isAnyRunning = runningTest !== null;

  const addLog = (log: Omit<LogEntry, 'timestamp'>) => {
    setLogs(prev => [...prev, { ...log, timestamp: new Date().toLocaleTimeString('es-CR', { hour12: false }) }]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runTest = async (test: TestCard) => {
    if (isAnyRunning) return;
    setRunningTest(test.id);
    setTestStatuses(prev => ({ ...prev, [test.id]: 'running' }));

    addLog({ status: 'WAIT', message: `━━━ Iniciando: ${test.label} ━━━` });

    try {
      const res = await fetch(`/api/admin/diagnostics/${test.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      let hasFailure = false;
      data.logs.forEach((log: LogEntry, i: number) => {
        setTimeout(() => {
          addLog(log);
          if (log.status === 'FAIL') hasFailure = true;
        }, i * 280);
      });

      setTimeout(() => {
        const finalStatus = hasFailure ? 'FAIL' : 'OK';
        addLog({
          status: finalStatus,
          message: `━━━ ${test.label}: ${finalStatus === 'OK' ? 'COMPLETADO ✓' : 'CON ERRORES ✗'} (${data.durationMs}ms) ━━━`,
        });
        setTestStatuses(prev => ({ ...prev, [test.id]: finalStatus === 'OK' ? 'ok' : 'fail' }));
        setRunningTest(null);
      }, data.logs.length * 280 + 350);

    } catch (error: any) {
      addLog({ status: 'FAIL', message: `Error de conexión con el servidor: ${error.message}` });
      setTestStatuses(prev => ({ ...prev, [test.id]: 'fail' }));
      setRunningTest(null);
    }
  };

  const runCleanup = async () => {
    if (isAnyRunning) return;
    setRunningTest('cleanup');
    addLog({ status: 'WAIT', message: '🗑️  Ejecutando limpieza de registros TEST_...' });
    try {
      const res = await fetch('/api/admin/diagnostics/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      data.logs.forEach((log: LogEntry, i: number) => {
        setTimeout(() => addLog(log), i * 200);
      });
      setTimeout(() => setRunningTest(null), data.logs.length * 200 + 200);
    } catch (err: any) {
      addLog({ status: 'FAIL', message: `Error en limpieza: ${err.message}` });
      setRunningTest(null);
    }
  };

  const getStatusBadge = (status: TestStatus) => {
    if (status === 'idle') return null;
    if (status === 'running') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 animate-pulse">CORRIENDO</span>;
    if (status === 'ok') return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">✓ OK</span>;
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">✗ ERROR</span>;
  };

  const okCount = Object.values(testStatuses).filter(s => s === 'ok').length;
  const failCount = Object.values(testStatuses).filter(s => s === 'fail').length;
  const totalRun = okCount + failCount;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header card */}
      <Card className="bg-gradient-to-br from-[#FFF5F2] to-white border border-[#F05023]/15 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F05023]/10 flex items-center justify-center">
                <Activity className="h-4 w-4 text-[#F05023]" />
              </div>
              <div>
                <CardTitle className="text-[#F05023] text-base leading-tight">Monitor de Salud del Sistema</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Tests de un clic — los registros TEST_ se limpian automáticamente</p>
              </div>
            </div>
            {totalRun > 0 && (
              <div className="flex items-center gap-2 text-xs">
                {okCount > 0 && <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">{okCount} OK</span>}
                {failCount > 0 && <span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded-full">{failCount} ERROR</span>}
                <span className="text-gray-400">/ {HEALTH_TESTS.length} tests</span>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Test cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {HEALTH_TESTS.map(test => {
          const status = testStatuses[test.id] ?? 'idle';
          const isThisRunning = runningTest === test.id;
          return (
            <button
              key={test.id}
              onClick={() => runTest(test)}
              disabled={isAnyRunning}
              className={`
                relative w-full text-left rounded-xl border-2 p-4 transition-all duration-150
                ${test.bgColor} ${test.borderColor}
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.98] group
              `}
            >
              {/* Status badge top-right */}
              <div className="absolute top-3 right-3">
                {getStatusBadge(status)}
              </div>

              <div className="text-2xl mb-2">{test.icon}</div>
              <div className={`font-bold text-sm ${test.color} mb-1`}>{test.label}</div>
              <p className="text-xs text-gray-500 leading-snug">{test.description}</p>

              {isThisRunning && (
                <div className="mt-3 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
                  <span className="text-[11px] text-gray-500">Ejecutando...</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Console */}
      <Card className="border-0 shadow-md overflow-hidden">
        <div className="bg-[#1a1a2e] rounded-t-lg px-4 py-2.5 flex items-center gap-2 border-b border-white/5">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <Terminal className="h-3.5 w-3.5 text-gray-500 ml-1" />
          <span className="text-[11px] font-mono text-gray-400 tracking-wide">monitor@virtual-agent ~ consola de diagnóstico</span>
          <div className="ml-auto flex items-center gap-2">
            {isAnyRunning && runningTest !== 'cleanup' && (
              <span className="text-[10px] text-orange-400 font-mono animate-pulse">● ejecutando...</span>
            )}
            {logs.length > 0 && (
              <button
                onClick={() => { setLogs([]); setTestStatuses({}); }}
                className="text-[10px] text-gray-500 hover:text-white font-mono transition-colors px-2 py-0.5 rounded border border-gray-700 hover:border-gray-500"
              >
                limpiar consola
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#0f0f1a] p-5 h-[380px] overflow-y-auto font-mono text-[12px] space-y-1.5">
          {logs.length === 0 ? (
            <div className="text-gray-600 italic text-center mt-16 select-none">
              <Terminal className="inline h-6 w-6 mb-2 opacity-30" />
              <br />
              Esperando ejecución de pruebas...
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-2 items-start animate-in fade-in slide-in-from-bottom-1">
                <span className="text-gray-600 shrink-0 mt-px">{log.timestamp}</span>
                <span className={`shrink-0 font-bold mt-px ${
                  log.status === 'OK' ? 'text-green-400' :
                  log.status === 'WAIT' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  [{log.status === 'OK' ? ' OK ' : log.status === 'WAIT' ? 'WAIT' : 'FAIL'}]
                </span>
                <span className={`leading-relaxed ${
                  log.status === 'OK' ? 'text-gray-200' :
                  log.status === 'WAIT' ? 'text-gray-300' :
                  'text-red-300'
                }`}>{log.message}</span>
              </div>
            ))
          )}
          {logs.filter(l => l.suggestion).map((log, i) => log.suggestion && (
            <div key={`sug-${i}`} className="ml-36 text-[11px] text-amber-300 bg-amber-950/25 border border-amber-800/30 px-3 py-1.5 rounded mt-0.5">
              💡 {log.suggestion}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Footer actions */}
        <div className="bg-[#111122] px-4 py-2.5 border-t border-white/5 flex items-center gap-3 flex-wrap">
          <button
            onClick={runCleanup}
            disabled={isAnyRunning}
            className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-orange-400 transition-colors disabled:opacity-40 font-mono"
          >
            <Trash2 className="h-3 w-3" />
            Limpiar registros TEST_
          </button>
          <div className="ml-auto text-[10px] text-gray-600 font-mono">
            {logs.length} línea{logs.length !== 1 ? 's' : ''} · Virtual Agent Health Monitor v2
          </div>
        </div>
      </Card>

    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PaymentsTab: weekly payments summary with per-user & bulk "mark paid" actions
// ──────────────────────────────────────────────────────────────────────────────
type WeeklyPaymentEntry = {
  userId: number;
  user: any;
  propertiesCount: number;
  totalPayment: number;
  weekStart: string;
  weekEnd: string;
};

function PaymentsTab({
  weeklyPayments,
  paymentsLoading,
  isSuperAdmin,
  onRefresh,
}: {
  weeklyPayments: WeeklyPaymentEntry[];
  paymentsLoading: boolean;
  isSuperAdmin: boolean;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [paidUsers, setPaidUsers] = useState<Set<number>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState<Set<number>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);

  const markUserPaid = async (userId: number, userName: string) => {
    setLoadingUsers(prev => new Set(prev).add(userId));
    try {
      const res = await fetch(`/api/admin/payments/mark-paid/${userId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setPaidUsers(prev => new Set(prev).add(userId));
        toast({
          title: '✅ Pago registrado',
          description: `Se marcó como pagado a ${userName}`,
        });
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.message || 'No se pudo registrar el pago', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', description: 'No se pudo conectar con el servidor', variant: 'destructive' });
    } finally {
      setLoadingUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });
    }
  };

  const markAllPaid = async () => {
    if (!window.confirm('¿Confirmas que ya se realizaron TODOS los pagos de esta semana?')) return;
    setMarkingAll(true);
    try {
      const res = await fetch('/api/admin/payments/mark-all-paid', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const ids = new Set(weeklyPayments.map(p => p.userId));
        setPaidUsers(ids);
        toast({ title: '✅ Todos los pagos registrados', description: 'Se marcó toda la semana como pagada.' });
        onRefresh();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.message || 'No se pudieron registrar los pagos', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setMarkingAll(false);
    }
  };

  if (paymentsLoading) {
    return (
      <Card className="bg-white border-0 shadow-md">
        <CardContent className="pt-8 flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-gray-600">Calculando pagos de la semana...</p>
        </CardContent>
      </Card>
    );
  }

  const totalProperties = weeklyPayments.reduce((s, p) => s + p.propertiesCount, 0);
  const totalAmount = weeklyPayments.reduce((s, p) => s + p.totalPayment, 0);
  const weekLabel = weeklyPayments[0]
    ? `${new Date(weeklyPayments[0].weekStart).toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })} – ${new Date(weeklyPayments[0].weekEnd).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';

  return (
    <Card className="bg-white border-0 shadow-md">
      <CardHeader className="bg-white pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Pagos Semanales
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Semana actual (Lun–Dom, zona CR): <span className="font-semibold text-gray-700">{weekLabel}</span>
              &nbsp;·&nbsp;₡250 por propiedad registrada.
            </p>
          </div>
          {isSuperAdmin && weeklyPayments.length > 0 && (
            <Button
              onClick={markAllPaid}
              disabled={markingAll || weeklyPayments.every(p => paidUsers.has(p.userId))}
              className="bg-green-600 hover:bg-green-700 text-white gap-2 shrink-0"
            >
              {markingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Marcar Todos Pagados
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="bg-white">
        {weeklyPayments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <DollarSign className="h-14 w-14 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No hay pagos pendientes esta semana.</p>
            <p className="text-sm mt-1">Los usuarios que registren propiedades aparecerán aquí.</p>
            <p className="text-xs mt-1 text-gray-400">El conteo se reinicia automáticamente cada lunes a las 00:00 hora de Costa Rica.</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-3 mb-5 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">{weeklyPayments.length}</p>
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Usuarios</p>
              </div>
              <div className="text-center border-x border-green-200">
                <p className="text-2xl font-bold text-green-700">{totalProperties}</p>
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Propiedades</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-700">₡{totalAmount.toLocaleString()}</p>
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total</p>
              </div>
            </div>

            {/* Tabla de pagos individuales */}
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table className="[&_th]:bg-gray-50 [&_th]:text-gray-700 [&_td]:bg-white [&_td]:text-gray-900">
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead>Usuario</TableHead>
                    <TableHead className="hidden sm:table-cell">Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">SINPE / Teléfono</TableHead>
                    <TableHead className="text-center">Propiedades</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    {isSuperAdmin && <TableHead className="text-center">Estado</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyPayments.map((payment) => {
                    const isPaid = paidUsers.has(payment.userId);
                    const isLoading = loadingUsers.has(payment.userId);
                    return (
                      <TableRow key={payment.userId} className={`border-gray-100 ${isPaid ? 'opacity-60' : ''}`}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{payment.user?.username || 'N/D'}</span>
                            <span className="text-[10px] text-gray-400">ID: {payment.userId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{payment.user?.fullName || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col">
                            <span className="font-mono font-semibold text-blue-700">{payment.user?.paymentMobile || '—'}</span>
                            {payment.user?.mobile && (
                              <span className="text-xs text-gray-400">Tel: {payment.user.mobile}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {payment.propertiesCount} {payment.propertiesCount === 1 ? 'prop.' : 'props.'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-700">
                          ₡{payment.totalPayment.toLocaleString()}
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                                <CheckCircle2 className="h-3 w-3" /> Pagado
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markUserPaid(payment.userId, payment.user?.fullName || payment.user?.username || 'usuario')}
                                disabled={isLoading}
                                className="h-7 text-xs border-green-400 text-green-700 hover:bg-green-50 gap-1"
                              >
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Marcar Pagado
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>ℹ️ Nota:</strong> El conteo de propiedades se reinicia automáticamente cada semana (lunes 00:00 hora de Costa Rica).
                Al hacer clic en "Marcar Pagado" solo se registra el estado localmente en esta sesión — el historial de pagos se gestiona en la base de datos con <code>isPaid</code>.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminWebPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("map");
  const [selectedUserId, setSelectedUserId] = useState<number | "all">("all");
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
    enabled: user?.isAdmin === true
  });

  const propertiesToDisplay = useMemo(() => properties.filter(p =>
    selectedUserId === "all" || p.userId === selectedUserId
  ), [properties, selectedUserId]);

  // Estado del buscador en la pestaña Lista
  const [listSearchQuery, setListSearchQuery] = useState("");

  const filteredListProperties = useMemo(() => {
    const q = listSearchQuery.trim().toLowerCase();
    if (!q) return propertiesToDisplay;
    return propertiesToDisplay.filter(p =>
      p.propertyId?.toLowerCase().includes(q) ||
      p.signPhoneNumber?.toLowerCase().includes(q) ||
      p.user?.fullName?.toLowerCase().includes(q) ||
      p.user?.username?.toLowerCase().includes(q)
    );
  }, [propertiesToDisplay, listSearchQuery]);

  // State for user profile editing
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', nickname: '', mobile: '', paymentMobile: '', username: '' });

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

  const updateUserProfileMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: typeof editForm }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      refetchUsers();
      setEditingUserId(null);
      toast({ title: "Perfil actualizado", description: "Información actualizada exitosamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Error al actualizar", description: error.message, variant: "destructive" });
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
  const { data: weeklyPayments = [], isLoading: paymentsLoading } = useQuery<WeeklyPaymentEntry[]>({
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
            className="text-white hover:text-white/80 p-0 relative z-10"
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
            className="text-white hover:text-white/80 p-0 relative z-10"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5 md:h-6 md:w-6" />
          </Button>
        </div>
      </header>

      <main style={{ flex: 1, width: '100vw', maxWidth: '100vw', padding: '1rem', margin: 0, backgroundImage: 'url("/assets/ciudad-optimized.webp")', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
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
              <DialogContent className="sm:max-w-md bg-[#FFF5F2] border-[#F05023]/20 [&>*]:bg-[#FFF5F2] [&_button]:text-[#F05023] [&_button]:hover:bg-[#F05023]/10 [&_button]:border-[#F05023]">
                <DialogHeader className="bg-[#FFF5F2]">
                  <DialogTitle className="text-[#F05023]">Compartir Virtual Agent</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center space-y-4 p-6 bg-[#FFF5F2] rounded-xl border border-[#F05023]/10">
                  <div className="bg-white p-4 rounded-2xl shadow-[0_8px_30px_rgb(240,80,35,0.1)] transition-transform hover:scale-105 duration-300">
                    <img 
                      src="/assets/qr-virtualagent.png"
                      alt="Código QR de Virtual Agent"
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                  <p className="text-sm text-center text-[#F05023] font-semibold tracking-tight">
                    Escanea para acceder a Virtual Agent
                  </p>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin).then(() => {
                        toast({
                          title: "¡Enlace copiado!",
                          description: "El enlace se ha copiado al portapapeles.",
                        });
                      });
                    }}
                    variant="outline"
                    className="w-full h-12 border-[#F05023] text-[#F05023] hover:bg-[#F05023] hover:text-white transition-all duration-300 font-bold rounded-xl"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Copiar Enlace
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          {/* Filtro de Usuarios y Estadísticas */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="w-full md:w-64">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">Filtrar por Agente</p>
                <Select
                  value={selectedUserId.toString()}
                  onValueChange={(val) => setSelectedUserId(val === "all" ? "all" : parseInt(val))}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 focus:ring-[#F05023]">
                    <SelectValue placeholder="Todos los Agentes" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900 border-gray-200">
                    <SelectItem value="all">Ver Todos (General)</SelectItem>
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.fullName || u.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                  <p className="text-[10px] md:text-xs font-medium text-orange-600 uppercase">Casas</p>
                  <p className="text-lg md:text-xl font-bold text-gray-900">{propertiesToDisplay.filter(p => p.propertyType === 'house').length}</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-[10px] md:text-xs font-medium text-green-600 uppercase">Terrenos</p>
                  <p className="text-lg md:text-xl font-bold text-gray-900">{propertiesToDisplay.filter(p => p.propertyType === 'land').length}</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-[10px] md:text-xs font-medium text-blue-600 uppercase">Comercial</p>
                  <p className="text-lg md:text-xl font-bold text-gray-900">{propertiesToDisplay.filter(p => p.propertyType === 'commercial').length}</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase">Total</p>
                  <p className="text-lg md:text-xl font-bold text-gray-900">{propertiesToDisplay.length}</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`w-full grid md:h-14 h-auto ${user.isSuperAdmin ? 'grid-cols-2 md:grid-cols-5' : (user.isAdmin ? 'grid-cols-3' : 'grid-cols-2')} bg-[#FF6347] p-0 gap-0 rounded-none border-b-2 border-[#ff7a5c] overflow-y-auto max-h-24 md:max-h-none`}>
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
              {user.isAdmin && (
                <TabsTrigger value="users" className="text-sm md:text-base text-white data-[state=active]:bg-[#ff7a5c] data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-800 rounded-none border-b-2 border-transparent data-[state=inactive]:bg-transparent">
                  <Users className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Usuarios
                </TabsTrigger>
              )}
              {user.isSuperAdmin && (
                <TabsTrigger value="payments" className="text-sm md:text-base text-white data-[state=active]:bg-[#ff7a5c] data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-800 rounded-none border-b-2 border-transparent data-[state=inactive]:bg-transparent">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  ₡ Pagos
                </TabsTrigger>
              )}
              {user.isSuperAdmin && (
                <TabsTrigger value="diagnostics" className="text-sm md:text-base text-white data-[state=active]:bg-[#ff7a5c] data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-gray-800 rounded-none border-b-2 border-transparent data-[state=inactive]:bg-transparent">
                  <Activity className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                  Salud
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="map" forceMount className="data-[state=inactive]:hidden">
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

                  <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] rounded-lg border-2 border-[#F05023]/20 shadow-inner overflow-hidden">
            <MapComponent 
              ref={mapComponentRef}
              properties={propertiesToDisplay} 
            />
          </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <div className="overflow-x-auto bg-white rounded-lg shadow-lg p-4 md:p-6">
                {/* Barra de herramientas: buscador + exportar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center justify-between">
                  {/* Buscador de propiedades */}
                  <div className="flex gap-2 flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Buscar por ID, teléfono o nombre..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#F05023]/40 focus:border-[#F05023]"
                      value={listSearchQuery}
                      onChange={(e) => setListSearchQuery(e.target.value)}
                    />
                    {listSearchQuery && (
                      <button
                        onClick={() => setListSearchQuery('')}
                        className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Limpiar búsqueda"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {/* Exportar (solo SuperAdmin) */}
                  {user.isSuperAdmin && (
                    <Button
                      onClick={() => exportToSheetsMutation.mutate()}
                      disabled={exportToSheetsMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 shrink-0"
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
                  )}
                </div>
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
                      <TableHead className="w-20 md:w-28 text-gray-800">ID / Estado</TableHead>
                      <TableHead className="md:w-32 text-gray-800">Tipo</TableHead>
                      <TableHead className="hidden sm:table-cell md:w-48 text-gray-800">Usuario</TableHead>
                      <TableHead className="hidden sm:table-cell md:w-40 text-gray-800">Teléfono</TableHead>
                      <TableHead className="hidden lg:table-cell text-gray-800">Provincia / Distrito</TableHead>
                      <TableHead className="hidden md:table-cell text-gray-800">Fecha Ingreso</TableHead>
                      <TableHead className="hidden md:table-cell w-14 pl-1 text-gray-800">Foto</TableHead>
                      <TableHead className="w-[140px] md:w-[180px] text-gray-800">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredListProperties.map((property) => {
                      const isPaid = (property as any).isPaid === true;
                      const rowColor = isPaid
                        ? 'bg-blue-50 hover:bg-blue-100 border-blue-100'
                        : 'bg-red-50 hover:bg-red-100 border-red-100';
                      const textColor = isPaid ? 'text-blue-800' : 'text-red-800';
                      return (
                      <TableRow key={property.propertyId} className={`${rowColor} border-gray-200`}>
                        <TableCell className={`font-medium ${textColor}`}>
                          <div className="flex flex-col gap-0.5">
                            <button
                              className={`${isPaid ? 'text-blue-600 hover:text-blue-800' : 'text-red-600 hover:text-red-800'} hover:underline cursor-pointer font-medium text-left`}
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
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-fit hidden sm:inline-block ${
                              isPaid
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {isPaid ? '✓ Pagado' : '● Por pagar'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={textColor}>
                          {property.propertyType === 'house' ? 'Casa' :
                            property.propertyType === 'land' ? 'Terreno' :
                              'Comercial'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-col">
                            <span className={property.user?.isDeleted ? "text-red-500 line-through text-xs" : "text-xs font-semibold text-gray-900"}>
                              {property.user?.fullName || property.user?.username || "Usuario Desconocido"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">ID: {property.userId}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`hidden sm:table-cell ${textColor}`}>
                          {property.signPhoneNumber || '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          {(() => {
                            const PROV: Record<string, string> = {
                              '01': 'San José', '02': 'Cartago', '03': 'Heredia',
                              '04': 'Alajuela', '05': 'Puntarenas', '06': 'Guanacaste', '07': 'Limón'
                            };
                            const DIST: Record<string, string> = {
                              '01-01': 'San José', '01-02': 'Escazú', '01-03': 'Desamparados', '01-04': 'Puriscal',
                              '01-05': 'Tarrazú', '01-06': 'Aser rí', '01-07': 'Mora', '01-08': 'Goicoechea',
                              '01-09': 'Santa Ana', '01-10': 'Alajuelita', '01-11': 'Vásquez de Coronado',
                              '01-12': 'Acosta', '01-13': 'Tibás', '01-14': 'Moravia', '01-15': 'Montes de Oca',
                              '01-16': 'Turrubares', '01-17': 'Dota', '01-18': 'Curridabat',
                              '01-19': 'Pérez Zeledón', '01-20': 'León Cortés Castro',
                              '02-01': 'Cartago', '02-02': 'Paraíso', '02-03': 'La Unión', '02-04': 'Jiménez',
                              '02-05': 'Turrialba', '02-06': 'Alvarado', '02-07': 'Oreamuno', '02-08': 'El Guarco',
                              '03-01': 'Heredia', '03-02': 'Barva', '03-03': 'Santo Domingo', '03-04': 'Santa Bárbara',
                              '03-05': 'San Rafael', '03-06': 'San Isidro', '03-07': 'Belén', '03-08': 'Flores',
                              '03-09': 'San Pablo', '03-10': 'Sarapiquí',
                              '04-01': 'Alajuela', '04-02': 'San Ramón', '04-03': 'Grecia', '04-04': 'San Mateo',
                              '04-05': 'Atenas', '04-06': 'Naranjo', '04-07': 'Palmares', '04-08': 'Poás',
                              '04-09': 'Orotina', '04-10': 'San Carlos', '04-11': 'Zarcero', '04-12': 'Sarchí',
                              '04-13': 'Upala', '04-14': 'Los Chiles', '04-15': 'Guatuso', '04-16': 'Río Cuarto',
                              '05-01': 'Puntarenas', '05-02': 'Esparza', '05-03': 'Buenos Aires', '05-04': 'Montes de Oro',
                              '05-05': 'Osa', '05-06': 'Quepos', '05-07': 'Golfito', '05-08': 'Coto Brus',
                              '05-09': 'Parrita', '05-10': 'Corredores', '05-11': 'Garabito',
                              '06-01': 'Liberia', '06-02': 'Nicoya', '06-03': 'Santa Cruz', '06-04': 'Bagaces',
                              '06-05': 'Carrillo', '06-06': 'Cañas', '06-07': 'Abangares', '06-08': 'Tilarán',
                              '06-09': 'Nandayure', '06-10': 'La Cruz', '06-11': 'Hojancha',
                              '07-01': 'Limón', '07-02': 'Pococí', '07-03': 'Siquirres', '07-04': 'Talamanca',
                              '07-05': 'Matina', '07-06': 'Guácimo',
                            };
                            const provCode = (property as any).province;
                            const distCode = (property as any).district;
                            const provName = provCode ? PROV[provCode] || provCode : null;
                            const distName = distCode ? DIST[distCode] || distCode : null;
                            const addr = property.location?.address;
                            return (
                              <div className="flex flex-col gap-0.5">
                                {provName && (
                                  <span className="font-semibold text-gray-800 flex items-center gap-1">
                                    📍 {provName}
                                  </span>
                                )}
                                {distName ? (
                                  <span className="text-[10px] text-gray-600 font-medium">{distName}</span>
                                ) : addr ? (
                                  <span className="text-[10px] text-gray-500 leading-tight line-clamp-2">{addr}</span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {property.location?.lat?.toFixed(5)}, {property.location?.lng?.toFixed(5)}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-gray-600">
                          {property.createdAt ? (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {new Date(property.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(property.createdAt).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell pl-1">
                          {(property as any).hasImages ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <button className="text-blue-600 hover:text-blue-800 hover:underline text-base font-bold cursor-pointer">
                                  Ver
                                </button>
                              </DialogTrigger>
                              <DialogContent className="w-[95vw] max-w-5xl bg-white border-0 shadow-2xl p-0 overflow-hidden">
                                <DialogHeader className="px-6 pt-5 pb-3 border-b border-gray-100">
                                  <DialogTitle className="text-gray-900 text-lg font-bold flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-[#F05023]" />
                                    Fotos de la Propiedad {property.propertyId}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="p-4 md:p-6">
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
                              <DialogContent className="w-[95vw] max-w-4xl bg-white border-0 shadow-2xl p-0 overflow-hidden">
                                <DialogHeader className="px-6 pt-5 pb-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #F05023, #FF6347)' }}>
                                  <DialogTitle className="text-white text-lg font-bold">Detalles de la Propiedad {property.propertyId}</DialogTitle>
                                </DialogHeader>
                                <div className="p-5 space-y-4 text-gray-900 overflow-y-auto max-h-[85vh]">
                                  {/* Info general */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
                                    <div>
                                      <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Tipo</span>
                                      <p className="font-semibold mt-0.5">{property.propertyType === 'house' ? '🏠 Casa' : property.propertyType === 'land' ? '🌿 Terreno' : '🏢 Comercial'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Usuario</span>
                                      <p className={`font-semibold mt-0.5 ${property.user?.isDeleted ? 'text-red-500 line-through' : ''}`}>
                                        {property.user?.fullName || property.user?.username || 'Usuario Desconocido'}{property.user?.isDeleted && ' (eliminado)'}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Teléfono</span>
                                      <p className="font-semibold mt-0.5">{property.signPhoneNumber || '-'}</p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Provincia</span>
                                      <p className="font-semibold mt-0.5">
                                        {(() => {
                                          const PROV: Record<string, string> = {
                                            '01': 'San José', '02': 'Cartago', '03': 'Heredia',
                                            '04': 'Alajuela', '05': 'Puntarenas', '06': 'Guanacaste', '07': 'Limón'
                                          };
                                          const code = (property as any).province;
                                          return code ? (PROV[code] || code) : 'No especificada';
                                        })()}
                                      </p>
                                    </div>
                                    {property.location?.address && (
                                      <div className="col-span-2">
                                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Dirección / Zona</span>
                                        <p className="font-semibold mt-0.5 text-sm">{property.location.address}</p>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Coordenadas GPS</span>
                                      <p className="font-mono text-xs mt-0.5 text-gray-700">{property.location?.lat?.toFixed(7) || '0'}, {property.location?.lng?.toFixed(7) || '0'}</p>
                                    </div>
                                  </div>
                                  {/* Galería de fotos a pantalla casi completa */}
                                  {(property as any).hasImages && (
                                    <div>
                                      <h4 className="font-semibold text-sm text-gray-600 uppercase tracking-wider mb-3">📸 Fotografías</h4>
                                      <PropertyImagesViewer propertyId={property.propertyId} />
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
                      );
                    })}
                  </TableBody>
                </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="diagnostics">
              <DiagnosticCenter />
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
                                <TableHead className="w-32 text-right pr-6">Acciones</TableHead>
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
                                    <div className="flex flex-col items-end gap-1">
                                      {user?.isSuperAdmin && !adminUser.isSuperAdmin && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-gray-500">Admin</span>
                                          <Switch
                                            checked={adminUser.isAdmin}
                                            onCheckedChange={(checked) =>
                                              updateRoleMutation.mutate({ userId: adminUser.id, isAdmin: checked })
                                            }
                                            disabled={updateRoleMutation.isPending}
                                          />
                                        </div>
                                      )}
                                      {user?.isSuperAdmin && user.id !== adminUser.id && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-red-500 font-bold">SUPER</span>
                                          <Switch
                                            checked={adminUser.isSuperAdmin}
                                            onCheckedChange={(checked) =>
                                              updateRoleMutation.mutate({ userId: adminUser.id, isAdmin: adminUser.isAdmin, isSuperAdmin: checked })
                                            }
                                            disabled={updateRoleMutation.isPending}
                                            className="data-[state=checked]:bg-red-600"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2 text-right pr-6 flex gap-2 justify-end">
                                    {/* Ver Detalles button for all admins */}
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">Ver Detalles</Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                        <DialogHeader className="px-6 py-4" style={{ backgroundColor: '#F05023', borderRadius: '0.75rem 0.75rem 0 0' }}>
                                          <DialogTitle className="text-white text-lg font-bold">Perfil de Usuario</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid gap-4 px-6 py-4 bg-white" style={{ backgroundColor: 'white' }}>
                                          {/* Informacion Personal */}
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                              <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wider">Información Personal</h4>
                                              {user?.isSuperAdmin && editingUserId !== adminUser.id && (
                                                <Button size="sm" variant="outline" onClick={() => {
                                                  setEditingUserId(adminUser.id);
                                                  setEditForm({ 
                                                    fullName: adminUser.fullName || '', 
                                                    nickname: adminUser.nickname || '', 
                                                    mobile: adminUser.mobile || '', 
                                                    paymentMobile: adminUser.paymentMobile || '',
                                                    username: adminUser.username || ''
                                                  });
                                                }}>&#9998; Editar</Button>
                                              )}
                                              {user?.isSuperAdmin && editingUserId === adminUser.id && (
                                                <div className="flex gap-2">
                                                  <Button size="sm" className="bg-[#F05023] hover:bg-[#E04015] text-white" disabled={updateUserProfileMutation.isPending}
                                                    onClick={() => updateUserProfileMutation.mutate({ userId: adminUser.id, data: editForm })}>
                                                    {updateUserProfileMutation.isPending ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Guardando...</> : "Guardar"}
                                                  </Button>
                                                  <Button size="sm" variant="outline" onClick={() => setEditingUserId(null)}>Cancelar</Button>
                                                </div>
                                              )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                              <div>
                                                <span className="font-semibold text-gray-700 block">Nombre Completo:</span>
                                                {editingUserId === adminUser.id ? (
                                                  <Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Nombre completo" className="mt-1 h-8 text-sm" />
                                                ) : (
                                                  <span className={adminUser.fullName ? "text-gray-900" : "text-gray-400 italic"}>{adminUser.fullName || "No completado"}</span>
                                                )}
                                              </div>
                                              <div>
                                                <span className="font-semibold text-gray-700 block">Alias:</span>
                                                {editingUserId === adminUser.id ? (
                                                  <Input value={editForm.nickname} onChange={e => setEditForm(f => ({ ...f, nickname: e.target.value }))} placeholder="Alias" className="mt-1 h-8 text-sm" />
                                                ) : (
                                                  <span className={adminUser.nickname ? "text-gray-900" : "text-gray-400 italic"}>{adminUser.nickname || "No completado"}</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          {/* Informacion de Contacto */}
                                          <div className="space-y-3">
                                            <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wider pt-2 border-t">Información de Contacto</h4>
                                            <div className="grid grid-cols-1 gap-3 text-sm">
                                              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                                                <div className="flex-1 mr-2">
                                                  <span className="font-semibold text-gray-700 block">Correo Electrónico (Usuario):</span>
                                                  {editingUserId === adminUser.id ? (
                                                    <Input 
                                                      value={editForm.username} 
                                                      onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} 
                                                      placeholder="correo@ejemplo.com" 
                                                      className="mt-1 h-8 text-sm" 
                                                    />
                                                  ) : (
                                                    <span className="text-gray-900">{adminUser.email || adminUser.username}</span>
                                                  )}
                                                </div>
                                                {editingUserId !== adminUser.id && (
                                                  <Button size="sm" variant="secondary" asChild>
                                                    <a href={`mailto:${adminUser.email || adminUser.username}`}>Escribir</a>
                                                  </Button>
                                                )}
                                              </div>
                                              <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                                                <div className="flex-1 mr-2">
                                                  <span className="font-semibold text-gray-700 block">Teléfono (WhatsApp):</span>
                                                  {editingUserId === adminUser.id ? (
                                                    <Input value={editForm.mobile} onChange={e => setEditForm(f => ({ ...f, mobile: e.target.value }))} placeholder="Ej: 88001234" className="mt-1 h-8 text-sm" />
                                                  ) : (
                                                    <span className={adminUser.mobile ? "text-gray-900" : "text-gray-400 italic"}>{adminUser.mobile ? `+506 ${adminUser.mobile}` : "No completado"}</span>
                                                  )}
                                                </div>
                                                {adminUser.mobile && editingUserId !== adminUser.id && (
                                                  <Button size="sm" variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200" asChild>
                                                    <a href={`https://wa.me/506${adminUser.mobile.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          {/* Datos de Facturacion */}
                                          <div className="space-y-2">
                                            <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wider pt-2 border-t">Datos de Facturación</h4>
                                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                                              <span className="font-semibold text-blue-900 block">Número SINPE Móvil:</span>
                                              {editingUserId === adminUser.id ? (
                                                <Input value={editForm.paymentMobile} onChange={e => setEditForm(f => ({ ...f, paymentMobile: e.target.value }))} placeholder="Ej: 88001234" className="mt-1 h-8 text-sm bg-white" />
                                              ) : (
                                                <span className={adminUser.paymentMobile ? "text-blue-900 font-bold" : "text-gray-400 italic"}>{adminUser.paymentMobile || "No completado"}</span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    {/* Delete button — super admin only */}
                                    {user?.isSuperAdmin && !adminUser.isSuperAdmin && (
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="destructive" size="sm" className="w-8 h-8 p-0">
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Confirmar eliminación</DialogTitle>
                                          </DialogHeader>
                                          <p>¿Está seguro que desea eliminar este usuario? Esta acción no se puede deshacer.</p>
                                          <DialogFooter>
                                            <Button variant="destructive" onClick={() => deleteUserMutation.mutate(adminUser.id)} disabled={deleteUserMutation.isPending}>
                                              {deleteUserMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Eliminando...</> : "Eliminar"}
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
            <PaymentsTab weeklyPayments={weeklyPayments} paymentsLoading={paymentsLoading} isSuperAdmin={!!user.isSuperAdmin} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/payments/weekly'] })} />
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