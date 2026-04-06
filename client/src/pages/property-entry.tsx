import { useState, useRef, useEffect } from "react";
import { PhonePreview } from "@/components/ui/phone-preview";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertySchema } from "@shared/schema";
import { Camera, MapPin, Upload, ChevronLeft, LogOut, X, Maximize } from "lucide-react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import imageCompression from "browser-image-compression";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export default function PropertyEntry() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeCamera, setActiveCamera] = useState<"sign" | "property" | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Immersive Camera States
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(5);
  const hasNativeZoomRef = useRef(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const currentZoomRef = useRef<number>(1);
  const [ocrTestResult, setOcrTestResult] = useState<{
    extractedText?: string;
    phoneNumbers?: string[];
  } | null>(null);
  const [showOcrDialog, setShowOcrDialog] = useState(false);
  const [showDuplicateError, setShowDuplicateError] = useState(false);
  const [duplicateErrorDetails, setDuplicateErrorDetails] = useState<{
    message: string;
    existingPropertyId?: string;
    distance?: string;
  } | null>(null);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const signFileInputRef = useRef<HTMLInputElement>(null);
  const propertyFileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      propertyType: "",
      province: "01",
      signPhoneNumber: "",
      location: { lat: 0, lng: 0 },
      images: { sign: "", property: "" },
      markerColor: ""
    }
  });

  // Cleanup function with proper null checks
  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.error('Error stopping track:', error);
        }
      });
      setStream(null);
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const mediaStream = videoRef.current.srcObject as MediaStream;
        mediaStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      } catch (error) {
        console.error('Error cleaning up video:', error);
      }
    }

    setActiveCamera(null);
    setIsCapturing(false);
  };

  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const testOCR = async () => {
    const signImage = form.watch("images.sign");
    if (!signImage) {
      toast({
        title: "Error",
        description: "Por favor, capture una foto del rótulo primero",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Procesando imagen",
        description: "Analizando el texto del rótulo...",
      });

      const response = await fetch('/api/test-ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: signImage }),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setOcrTestResult(result);

        if (result.phoneNumbers?.length > 0) {
          const phoneNumber = result.phoneNumbers[0];
          form.setValue('signPhoneNumber', phoneNumber);
          toast({
            title: "Número detectado",
            description: `Se encontró el número: ${phoneNumber}`,
          });
        } else {
          toast({
            title: "Aviso",
            description: "No se detectaron números de teléfono en la imagen",
            variant: "destructive"
          });
        }
        setShowOcrDialog(true);
      } else {
        toast({
          title: "Error",
          description: result.message || "Error al procesar la imagen",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing OCR:', error);
      toast({
        title: "Error",
        description: "Error al procesar la imagen con OCR",
        variant: "destructive"
      });
    }
  };

  const startCamera = async (type: "sign" | "property") => {
    try {
      cleanup();
      setIsCapturing(true);
      setActiveCamera(type);

      // Estrategia: Solicitar la máxima resolución posible en cámara trasera
      const tryConstraints = [
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } } },
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        { video: { facingMode: "environment" } },
        { video: true }
      ];

      let mediaStream: MediaStream | null = null;
      for (const c of tryConstraints) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(c);
          break;
        } catch {
          continue;
        }
      }

      if (!mediaStream) {
        throw new Error("No se pudo acceder a la cámara");
      }

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Check para Zoom capability
      const track = mediaStream.getVideoTracks()[0];
      let nativeZoomSupported = false;
      if (track && track.getCapabilities) {
        try {
          const capabilities = track.getCapabilities() as any;
          if (capabilities && capabilities.zoom) {
            nativeZoomSupported = true;
            setMinZoom(capabilities.zoom.min || 1);
            setMaxZoom(capabilities.zoom.max || 5);
            
            const settings = track.getSettings?.() as any;
            const currentZ = settings?.zoom || capabilities.zoom.min || 1;
            setZoom(currentZ);
            zoomRef.current = currentZ;
          }
        } catch(e) {
          console.log("Capabilities de Zoom no permitidas por el navegador", e);
        }
      }
      hasNativeZoomRef.current = nativeZoomSupported;
      
      if (!nativeZoomSupported) {
        setMinZoom(1);
        setMaxZoom(5);
        setZoom(1);
        zoomRef.current = 1;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Error de cámara",
        description: "No se pudo acceder a la cámara. Usá el botón 'Subir desde galería' o ejecutá con HTTPS (npm run dev:https).",
        variant: "destructive",
        duration: 8000
      });
      cleanup();
    }
  };

  const applyZoomToCamera = (newZoom: number) => {
      setZoom(newZoom);
      zoomRef.current = newZoom;
      
    if (hasNativeZoomRef.current && stream) {
      const track = stream.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        try {
          track.applyConstraints({
            advanced: [{ zoom: newZoom }]
          } as any);
        } catch (err) {
          console.warn('El dispositivo o navegador no aplicó el zoom:', err);
        }
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
      currentZoomRef.current = zoomRef.current;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      // Intentamos evitar scroll de pantalla nativo mientras usamos pinch
      if (e.cancelable) e.preventDefault();
      
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const scale = distance / initialPinchDistanceRef.current;
      let newZoom = currentZoomRef.current * scale;
      
      newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
      applyZoomToCamera(newZoom);
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistanceRef.current = null;
  };

  const handleZoomSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    applyZoomToCamera(val);
  };

  const processFileUpload = async (file: File, type: "sign" | "property") => {
    try {
      setIsCompressing(true);
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 5,
        maxWidthOrHeight: 2560,
        useWebWorker: true
      });

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        form.setValue(`images.${type}`, base64data);

        const originalSize = Math.round(file.size / 1024);
        const compressedSize = Math.round(compressedFile.size / 1024);
        const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100);

        toast({
          title: "Imagen subida",
          description: `Comprimida de ${originalSize}KB a ${compressedSize}KB (${savings}% menos)`,
          duration: 3000,
        });
        cleanup();
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error al subir",
        description: "No se pudo procesar la imagen. Intentá de nuevo.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const type = activeCamera;
    if (!file) return;
    if (type) {
      await processFileUpload(file, type);
    }
    event.target.value = "";
  };

  const handleDirectGalleryUpload = (type: "sign" | "property") => {
    const input = type === "sign" ? signFileInputRef.current : propertyFileInputRef.current;
    if (input) {
      setActiveCamera(type);
      input.click();
    }
  };

  const handleDirectFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, type: "sign" | "property") => {
    const file = event.target.files?.[0];
    if (file) await processFileUpload(file, type);
    event.target.value = "";
  };

  const applyManualCoords = () => {
    const lat = parseFloat(manualLat.replace(",", "."));
    const lng = parseFloat(manualLng.replace(",", "."));
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: "Coordenadas inválidas",
        description: "Latitud debe estar entre -90 y 90. Longitud entre -180 y 180.",
        variant: "destructive"
      });
      return;
    }
    form.setValue("location", { lat, lng });
    toast({
      title: "Ubicación guardada",
      description: `Coordenadas: ${lat.toFixed(7)}, ${lng.toFixed(7)}`
    });
    setShowManualCoords(false);
    setManualLat("");
    setManualLng("");
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !activeCamera) return;

    // Efecto visual de Flash/Obturador
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) return;

      context.fillStyle = 'black';
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (hasNativeZoomRef.current) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        // Simulated zoom (crop)
        const currentZ = zoomRef.current || 1;
        const sourceWidth = video.videoWidth / currentZ;
        const sourceHeight = video.videoHeight / currentZ;
        const sourceX = (video.videoWidth - sourceWidth) / 2;
        const sourceY = (video.videoHeight - sourceHeight) / 2;
        
        context.drawImage(
          video, 
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, canvas.width, canvas.height
        );
      }
      
      const imageData = canvas.toDataURL('image/jpeg');

      const compressedImage = await compressImage(imageData);
      form.setValue(`images.${activeCamera}`, compressedImage);

      const originalSize = Math.round(imageData.length / 1024);
      const compressedSize = Math.round(compressedImage.length / 1024);
      const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100);

      toast({
        title: "Photo Captured",
        description: `Image compressed from ${originalSize}KB to ${compressedSize}KB (${savings}% reduction)`,
      });

      cleanup();
    } catch (error) {
      console.error('Error capturing photo:', error);
      toast({
        title: "Capture Error",
        description: "Failed to capture photo. Please try again or use file upload.",
        variant: "destructive"
      });
    }
  };

  const compressImage = async (imageDataUrl: string): Promise<string> => {
    try {
      setIsCompressing(true);

      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], "image.jpg", { type: "image/jpeg" });

      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.8,
        alwaysKeepResolution: false,
      };

      const compressedFile = await imageCompression(file, options);

      if (compressedFile.size > 1024 * 1024) {
        const secondPassOptions = {
          ...options,
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1600,
          initialQuality: 0.7
        };
        const furtherCompressedFile = await imageCompression(compressedFile, secondPassOptions);
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(furtherCompressedFile);
        });
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(compressedFile);
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      toast({
        title: "Compression Error",
        description: "Failed to compress image. Using original size.",
        variant: "destructive",
        duration: 5000
      });
      return imageDataUrl;
    } finally {
      setIsCompressing(false);
    }
  };

  const captureLocation = async () => {
    try {
      // Verificar si el navegador soporta geolocalización
      if (!("geolocation" in navigator)) {
        console.error("Geolocation API not available");
        toast({
          title: "Error",
          description: "Su navegador no soporta la geolocalización",
          variant: "destructive",
          duration: 5000
        });
        return;
      }

      // Mostrar toast de cargando
      toast({
        title: "Capturando ubicación",
        description: "Por favor, espere mientras obtenemos su ubicación...",
      });

      console.log("Starting location capture...");

      // Verificar permisos (puede no estar disponible en todos los navegadores)
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        console.log("Geolocation permission status:", permission.state);
        if (permission.state === 'denied') {
          throw new Error('PERMISSION_DENIED');
        }
      } catch (permErr) {
        console.log("Permissions API not available or error:", permErr);
        // Continuar igual - getCurrentPosition pedirá permiso si es necesario
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        console.log("Requesting position...");
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log("Position success:", {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            });
            resolve(pos);
          },
          (error) => {
            console.error("Detailed geolocation error:", {
              code: error.code,
              message: error.message,
              PERMISSION_DENIED: error.PERMISSION_DENIED,
              POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
              TIMEOUT: error.TIMEOUT
            });
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 0
          }
        );
      });

      // Verificar precisión antes de guardar
      const accuracy = position.coords.accuracy;
      const accuracyWarning = accuracy > 60;

      // Actualizar el formulario con la ubicación
      form.setValue("location", {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });

      // Mostrar mensaje de éxito con advertencia si la precisión es baja
      toast({
        title: accuracyWarning ? "⚠️ Baja Precisión detectada" : "🎯 Ubicación capturada",
        description: (
          <div className="space-y-1">
            <p>Ubicación registrada: {position.coords.latitude.toFixed(7)}, {position.coords.longitude.toFixed(7)}</p>
            {accuracyWarning && (
              <p className="text-destructive font-bold text-sm">
                Nota: La señal de GPS es débil (margen de error: {Math.round(accuracy)}m). 
                Se recomienda moverse a un lugar más despejado y capturar de nuevo.
              </p>
            )}
          </div>
        ),
        variant: accuracyWarning ? "destructive" : "default",
        duration: 10000
      });

    } catch (error: any) {
      console.error("Location capture error:", error);

      let errorMessage = "Error al obtener la ubicación.";

      if (error.message === 'PERMISSION_DENIED' || error.code === 1) {
        errorMessage = "Por favor, permita el acceso a su ubicación en la configuración de su navegador y vuelva a intentarlo. Asegúrese de que su dispositivo tenga el GPS activado.";
      } else if (error.code === 2) {
        errorMessage = "No se pudo obtener la ubicación. Por favor, verifique que su GPS está activado y que se encuentra en un lugar con buena señal.";
      } else if (error.code === 3) {
        errorMessage = "La obtención de ubicación tomó demasiado tiempo. Por favor, asegúrese de tener el GPS activado y estar en un lugar con buena señal, luego intente nuevamente.";
      }

      toast({
        title: "Error de ubicación",
        description: `${errorMessage} Podés usar "Coordenadas manuales" como alternativa.`,
        variant: "destructive",
        duration: 8000
      });
      setShowManualCoords(true);
    }
  };

  const createPropertyMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Starting mutation with data:", data);
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        // Si el error contiene detalles de duplicación, guardamos la información
        if (result.details?.existingPropertyId) {
          setDuplicateErrorDetails({
            message: result.message,
            existingPropertyId: result.details.existingPropertyId,
            distance: result.details.distance
          });
          setShowDuplicateError(true);
          throw new Error('DUPLICATE_PROPERTY');
        }
        throw new Error(result.message || 'Error al crear la propiedad');
      }

      console.log("Mutation successful, result:", result);
      return result;
    },
    onSuccess: (data) => {
      console.log("Mutation onSuccess called with data:", data);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setLocation(`/property-confirmation/${data.property.propertyId}`);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      // Solo mostrar el toast para errores que no son de duplicación
      if (error.message !== 'DUPLICATE_PROPERTY') {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
          duration: 7000
        });
      }
    }
  });


  const onSubmit = async (data: any) => {
    try {
      console.log("Form submission started with data:", data);

      if (!data.propertyType) {
        console.log("Property type validation failed");
        toast({
          title: "Error",
          description: "Por favor, seleccione un tipo de propiedad",
          variant: "destructive"
        });
        return;
      }

      if (!data.images.sign || !data.images.property) {
        console.log("Images validation failed:", data.images);
        toast({
          title: "Error",
          description: "Por favor, capture ambas fotos: rótulo y propiedad",
          variant: "destructive"
        });
        return;
      }

      if (data.location.lat === 0 && data.location.lng === 0) {
        console.log("Location validation failed:", data.location);
        toast({
          title: "Error",
          description: "Por favor, capture la ubicación de la propiedad",
          variant: "destructive"
        });
        return;
      }

      const markerColorMap: Record<string, string> = {
        house: "blue",
        land: "green",
        commercial: "yellow"
      };
      data.markerColor = markerColorMap[data.propertyType] || "blue";
      data.createdAt = new Date().toISOString();

      console.log("All validations passed, calling mutation");
      await createPropertyMutation.mutateAsync(data);

      console.log("Form submission completed successfully");
    } catch (error) {
      console.error('Error submitting property:', error);
      toast({
        title: "Error",
        description: "Error al enviar la propiedad. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
      setLocation('/');
    }
  });

  return (
    <div className="full-screen-layout bg-gray-100">
      <header className="page-header">
        <div className="flex items-center justify-between content-wrapper">
          <Button
            variant="ghost"
            className="text-white hover:text-white/80 p-0 relative z-10"
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
            className="text-white hover:text-white/80 p-0 relative z-10"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="page-content bg-cover bg-center bg-no-repeat content-wrapper" style={{backgroundImage: 'url("/assets/ciudad-optimized.webp")'}}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <Card className="bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-center text-xl">
                    Registrar Propiedad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                      console.error("Form validation errors:", errors);
                      const errorMessages: string[] = [];
                      if (errors.propertyType) errorMessages.push("Seleccione tipo de propiedad");
                      if (errors.province) errorMessages.push("Seleccione provincia");
                      if (errors.images) errorMessages.push("Capture las fotos requeridas");
                      if (errors.location) errorMessages.push("Capture la ubicación");
                      toast({
                        title: "Formulario incompleto",
                        description: errorMessages.length > 0 ? errorMessages.join(", ") : "Por favor, revise los campos del formulario",
                        variant: "destructive"
                      });
                    })} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="propertyType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg">Tipo de Propiedad</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                                  <SelectValue placeholder="Seleccione tipo de propiedad" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border border-gray-200 text-gray-900 [&_[data-highlighted]]:bg-gray-100">
                                <SelectItem value="house" className="text-gray-900 focus:bg-gray-100 focus:text-gray-900">Casa</SelectItem>
                                <SelectItem value="land" className="text-gray-900 focus:bg-gray-100 focus:text-gray-900">Terreno</SelectItem>
                                <SelectItem value="commercial" className="text-gray-900 focus:bg-gray-100 focus:text-gray-900">Local Comercial</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg">Provincia</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-200 text-gray-900">
                                  <SelectValue placeholder="Seleccione provincia" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border border-gray-200 text-gray-900 [&_[data-highlighted]]:bg-gray-100">
                                <SelectItem value="01" className="text-gray-900 focus:bg-gray-100 focus:text-gray-900">San José</SelectItem>
                                <SelectItem value="02" className="text-gray-900 focus:bg-gray-100 focus:text-gray-900">Cartago</SelectItem>
                                <SelectItem value="03" className="text-gray-900 focus:bg-gray-100 focus:text-gray-900">Heredia</SelectItem>
                                <SelectItem value="04" className="text-gray-900 focus:bg-gray-100 focus:text-gray-900">Alajuela</SelectItem>
                                <SelectItem value="05" className="text-gray-900 focus:bg-gray-100 focus:text-gray-900">Puntarenas</SelectItem>
                                <SelectItem value="06" className="text-gray-900 focus:bg-gray-100 focus:text-gray-900">Guanacaste</SelectItem>
                                <SelectItem value="07" className="text-gray-900 focus:bg-gray-100 focus:text-gray-900">Limón</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="signPhoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg">Número de Teléfono del Rótulo (Opcional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="tel"
                                autoComplete="tel"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Fotos de la Propiedad</h3>
                        <p className="text-sm text-gray-600">Si la cámara no funciona, usá "Subir desde galería"</p>
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="flex-1 h-32 flex flex-col items-center justify-center relative border-2 border-gray-300 rounded-lg hover:border-[#F05023] transition-colors bg-white"
                                onClick={() => startCamera("sign")}
                                disabled={isCompressing}
                              >
                                <Camera className="h-8 w-8 mb-2" />
                                <span>Tomar foto</span>
                              </button>
                              <button
                                type="button"
                                className="flex-1 h-32 flex flex-col items-center justify-center border-2 border-[#F05023] rounded-lg hover:bg-[#F05023]/10 transition-colors bg-white text-[#F05023]"
                                onClick={() => handleDirectGalleryUpload("sign")}
                                disabled={isCompressing}
                              >
                                <Upload className="h-8 w-8 mb-2" />
                                <span>Subir desde galería</span>
                              </button>
                            </div>
                            <input
                              ref={signFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleDirectFileSelect(e, "sign")}
                            />
                            {form.watch("images.sign") && (
                              <div className="relative rounded-lg overflow-hidden border">
                                <img src={form.watch("images.sign")} alt="Rótulo" className="w-full h-24 object-cover" />
                                <button
                                  type="button"
                                  onClick={testOCR}
                                  className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white text-[#F05023] px-4 py-1 rounded-full text-sm shadow-md hover:bg-gray-50"
                                >
                                  Verificar OCR
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="flex-1 h-32 flex flex-col items-center justify-center relative border-2 border-gray-300 rounded-lg hover:border-[#F05023] transition-colors bg-white"
                                onClick={() => startCamera("property")}
                                disabled={isCompressing}
                              >
                                <Camera className="h-8 w-8 mb-2" />
                                <span>Tomar foto</span>
                              </button>
                              <button
                                type="button"
                                className="flex-1 h-32 flex flex-col items-center justify-center border-2 border-[#F05023] rounded-lg hover:bg-[#F05023]/10 transition-colors bg-white text-[#F05023]"
                                onClick={() => handleDirectGalleryUpload("property")}
                                disabled={isCompressing}
                              >
                                <Upload className="h-8 w-8 mb-2" />
                                <span>Subir desde galería</span>
                              </button>
                            </div>
                            <input
                              ref={propertyFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleDirectFileSelect(e, "property")}
                            />
                            {form.watch("images.property") && (
                              <img src={form.watch("images.property")} alt="Propiedad" className="w-full h-24 object-cover rounded-lg border" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center border-2 border-gray-300 rounded-lg hover:border-[#F05023] transition-colors bg-white"
                            onClick={captureLocation}
                          >
                            <MapPin className="h-6 w-6 mb-1" />
                            <span>Capturar GPS</span>
                          </button>
                          <button
                            type="button"
                            className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center border-2 border-[#F05023] rounded-lg hover:bg-[#F05023]/10 transition-colors bg-white text-[#F05023]"
                            onClick={() => setShowManualCoords(!showManualCoords)}
                          >
                            <MapPin className="h-6 w-6 mb-1" />
                            <span>Coordenadas manuales</span>
                          </button>
                        </div>
                        {form.watch("location.lat") !== 0 && (
                          <p className="text-sm text-gray-600">
                            Ubicación: {form.watch("location.lat").toFixed(7)}, {form.watch("location.lng").toFixed(7)}
                          </p>
                        )}
                        {showManualCoords && (
                          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                            <p className="text-sm text-gray-700">Buscá la ubicación en Google Maps y copiá las coordenadas</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Latitud (ej: 9.9319)"
                                value={manualLat}
                                onChange={(e) => setManualLat(e.target.value)}
                                className="bg-white"
                              />
                              <Input
                                placeholder="Longitud (ej: -84.0925)"
                                value={manualLng}
                                onChange={(e) => setManualLng(e.target.value)}
                                className="bg-white"
                              />
                            </div>
                            <Button type="button" onClick={applyManualCoords} className="w-full bg-[#F05023] hover:bg-[#E04015]">
                              Aplicar coordenadas
                            </Button>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#F05023] text-white py-3 rounded-md font-semibold disabled:opacity-50"
                        disabled={isCompressing || createPropertyMutation.isPending}
                      >
                        {createPropertyMutation.isPending ? "Enviando..." : "Enviar Propiedad"}
                      </button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {showDuplicateError && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-[90%] rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-center text-red-600 font-semibold">
                  Propiedad Duplicada
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-center text-sm text-red-700 font-medium">
                  {duplicateErrorDetails?.message}
                </p>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>ID de propiedad existente: {duplicateErrorDetails?.existingPropertyId}</p>
                  <p>Distancia: {duplicateErrorDetails?.distance}</p>
                </div>
                <div className="flex justify-center pt-2">
                  <Button
                    onClick={() => setShowDuplicateError(false)}
                    className="w-full"
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isCapturing && (
        <div className="fixed inset-0 z-50 w-[100vw] h-[100vh] bg-black overflow-hidden flex flex-col items-center justify-center touch-none">
          {/* Shutter Animation Overlay */}
          <div className={`absolute inset-0 bg-black z-40 pointer-events-none transition-opacity duration-100 ${isFlashing ? "opacity-100" : "opacity-0"}`} />
          
          {/* Top Controls Overlay */}
          <div className="absolute top-0 left-0 w-full p-4 md:p-6 z-30 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
            <button 
              onClick={cleanup}
              className="text-white bg-black/40 backdrop-blur-md p-3 rounded-full hover:bg-black/60 active:scale-95 transition-all outline-none"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="flex gap-3">
               <button 
                onClick={() => { cleanup(); fileInputRef.current?.click(); }}
                className="text-white bg-black/40 backdrop-blur-md p-3 rounded-full hover:bg-black/60 active:scale-95 transition-all outline-none"
               >
                 <Upload className="h-6 w-6" />
               </button>
            </div>
          </div>

          {/* Video Container with Gestures */}
          <div 
             className="relative w-full h-full flex-1 touch-none overflow-hidden flex items-center justify-center bg-black"
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform duration-100 origin-center ${!hasNativeZoomRef.current ? 'will-change-transform' : ''}`}
              style={{ 
                 objectFit: 'cover',
                 transform: !hasNativeZoomRef.current ? `scale(${zoomRef.current})` : 'none'
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Zoom Controls Overlay (Slider) */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 h-1/3 min-h-[150px] flex flex-col items-center justify-between pointer-events-auto bg-black/30 backdrop-blur-sm rounded-full py-4 px-2">
             <span className="text-white text-xs font-bold font-mono shadow-[0_0_2px_rgba(0,0,0,0.8)]">{(zoom).toFixed(1)}x</span>
             <input 
                type="range"
                min={minZoom}
                max={maxZoom}
                step={0.1}
                value={zoom}
                onChange={handleZoomSliderChange}
                style={{ writingMode: 'vertical-lr', direction: 'rtl' } as any}
                className="h-full w-4 appearance-none my-3 bg-white/30 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg active:[&::-webkit-slider-thumb]:scale-110" 
             />
             <Maximize className="h-4 w-4 text-white opacity-90 shadow-sm" />
          </div>

          {/* Shutter Button Overlay */}
          <div className="absolute bottom-0 left-0 w-full p-8 z-30 flex flex-col justify-end items-center bg-gradient-to-t from-black/80 to-transparent pb-10">
            <button
              onClick={capturePhoto}
              disabled={isCompressing}
              className="w-[76px] h-[76px] rounded-full border-[3px] border-white flex items-center justify-center p-[4px] active:scale-95 transition-transform outline-none"
            >
               <div className={`w-full h-full bg-white rounded-full ${isCompressing ? "animate-pulse bg-gray-300" : "bg-white"} transition-colors`}></div>
            </button>
            <span className="mt-4 text-white/90 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md">
              {activeCamera === "sign" ? "Foto del Rótulo" : "Foto Propiedad"}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}

      {showOcrDialog && (
        <Dialog open={showOcrDialog} onOpenChange={setShowOcrDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Resultados del OCR</DialogTitle>
              <DialogDescription>
                Resultado del análisis de la imagen del rótulo:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Texto Extraído:</h4>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">
                    {ocrTestResult?.extractedText || "No se extrajo texto"}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Números de Teléfono Detectados:</h4>
                <div className="p-3 bg-muted rounded-md">
                  {ocrTestResult?.phoneNumbers?.length ? (
                    <ul className="space-y-1">
                      {ocrTestResult.phoneNumbers.map((phone, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-medium text-primary">{phone}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No se detectaron números de teléfono
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}