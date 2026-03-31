import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PropertyWithUser, insertMessageSchema, InsertMessage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, MapPin, Image as ImageIcon, ChevronLeft, Users, Plus, Trash2, MessageCircle, Loader2, DollarSign, MessageSquare, Share2, FileSpreadsheet, Bell, Activity, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useEffect, useState, useRef, memo, useCallback, forwardRef, useImperativeHandle } from "react";
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
  const { toast } = useToast();

  // Cleanup function to remove markers and listeners
  const cleanupMap = useCallback(() => {
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
                        <div><strong>Area Total:</strong><br/>${data.area ? data.area + ' m2' : 'N/A'}</div>
                        <div><strong>Area Const:</strong><br/>${data.built_area ? data.built_area + ' m2' : 'N/A'}</div>
                        <div><strong>Ano Const:</strong><br/>${data.building_date || 'N/A'}</div>
                        <div><strong>Condicion:</strong><br/>${data.property_condition_label || 'N/A'}</div>
                        ${data.bedrooms ? '<div><strong>Dormitorios:</strong><br/>' + data.bedrooms + '</div>' : ''}
                        ${data.bathrooms ? '<div><strong>Banos:</strong><br/>' + data.bathrooms + '</div>' : ''}
                        ${data.garages ? '<div><strong>Garages:</strong><br/>' + data.garages + '</div>' : ''}
                      </div>
                      <div style="margin-top: 6px; border-top: 1px dotted #ccc; padding-top: 5px; font-size: 11px;">
                        ${data.city_label ? data.city_label + (data.region_label ? ', ' + data.region_label : '') : ''}
                      </div>
                    `;
