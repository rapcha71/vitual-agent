import { useState, useRef, useEffect } from "react";
import { PhonePreview } from "@/components/ui/phone-preview";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertySchema } from "@shared/schema";
import { Camera, MapPin, X, Upload, ChevronLeft, LogOut } from "lucide-react"; // Added LogOut import
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import imageCompression from "browser-image-compression";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";

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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrTestResult, setOcrTestResult] = useState<{ extractedText?: string; phoneNumbers?: string[] } | null>(null);
  const [showOcrDialog, setShowOcrDialog] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      propertyType: "",
      signPhoneNumber: "",
      location: { lat: 0, lng: 0 },
      propertyId: nanoid(8),
      images: { sign: "", property: "" },
      markerColor: ""
    }
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (formData: any) => {
      console.log("Starting property submission with data:", {
        propertyType: formData.propertyType,
        hasSignImage: !!formData.images?.sign,
        hasPropertyImage: !!formData.images?.property,
        location: formData.location
      });

      toast({
        title: "Uploading",
        description: "Please wait while we save your property...",
      });

      try {
        const response = await fetch('/api/properties', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Server response error:", data);
          throw new Error(data.message || data.error || 'Failed to submit property');
        }

        return data;
      } catch (error: any) {
        console.error("Submission error details:", {
          message: error.message,
          cause: error.cause,
          stack: error.stack
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Property submission successful:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });

      toast({
        title: "Success!",
        description: data.message || "Property has been successfully added",
        duration: 5000,
      });

      // Redirect to confirmation page with property ID
      setLocation(`/confirmation?id=${data.property.propertyId}`);
    },
    onError: (error: any) => {
      console.error("Property submission error:", {
        message: error.message,
        details: error.details
      });

      toast({
        title: "Error",
        description: error.message || "Failed to add property. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  };

  useEffect(() => {
    getDevices();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActiveCamera(null);
    setIsCapturing(false);
  };

  const startCamera = async (type: "sign" | "property") => {
    try {
      cleanup();
      setIsCapturing(true);
      setActiveCamera(type);

      const constraints = {
        video: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          facingMode: "environment"
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Unable to access device camera. Try uploading an image instead.",
        variant: "destructive"
      });
      cleanup();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeCamera) return;

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
        form.setValue(`images.${activeCamera}`, base64data);

        const originalSize = Math.round(file.size / 1024);
        const compressedSize = Math.round(compressedFile.size / 1024);
        const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100);

        toast({
          title: "Image Uploaded",
          description: `Image compressed from ${originalSize}KB to ${compressedSize}KB (${savings}% reduction)`,
          duration: 3000,
        });
        cleanup();
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Upload Error",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !activeCamera) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) return;

      context.drawImage(video, 0, 0);
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
        onProgress: (progress: number) => {
          console.log('Compression progress:', progress);
        }      };

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

  const captureLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          form.setValue("location", {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast({
            title: "Location Captured",
            description: "Property location has been recorded successfully."
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Unable to get current location. Please check permissions.",
            variant: "destructive"
          });
        }
      );
    } else {
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by your browser.",
        variant: "destructive"
      });
    }
  };

  const onSubmit = async (data: any) => {
    try {
      console.log("Form submission started");

      if (!data.propertyType) {
        toast({
          title: "Error",
          description: "Please select a property type",
          variant: "destructive"
        });
        return;
      }

      if (!data.images.sign || !data.images.property) {
        toast({
          title: "Error",
          description: "Please capture both sign and property photos",
          variant: "destructive"
        });
        return;
      }

      if (data.location.lat === 0 && data.location.lng === 0) {
        toast({
          title: "Error",
          description: "Please capture the property location",
          variant: "destructive"
        });
        return;
      }

      await createPropertyMutation.mutateAsync(data);

      console.log("Form submission completed successfully");
    } catch (error) {
      console.error('Error submitting property:', error);
      toast({
        title: "Error",
        description: "Failed to submit property. Please try again.",
        variant: "destructive"
      });
    }
  };

  const testOCR = async () => {
    const signImage = form.getValues("images.sign");
    if (!signImage) {
      toast({
        title: "No Sign Image",
        description: "Please capture a sign photo first",
        variant: "destructive"
      });
      return;
    }

    try {
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
        setShowOcrDialog(true);
      } else {
        toast({
          title: "OCR Test Failed",
          description: result.message || "Failed to process image",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing OCR:', error);
      toast({
        title: "OCR Test Error",
        description: "Failed to test OCR functionality",
        variant: "destructive"
      });
    }
  };

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setLocation('/');
    }
  })

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <PhonePreview>
        <header className="bg-[#F05023] px-4 py-3">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              className="text-white hover:text-white/80 p-0"
              onClick={() => setLocation("/")}
            >
              <ChevronLeft className="h-5 w-5" />
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

        <div className="p-4 bg-cover bg-center bg-no-repeat overflow-y-auto" style={{backgroundImage: 'url("/assets/ciudad.jpeg")'}} >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg">Tipo de Propiedad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo de propiedad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="house">Casa</SelectItem>
                        <SelectItem value="land">Terreno</SelectItem>
                        <SelectItem value="commercial">Local Comercial</SelectItem>
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Fotos de la Propiedad</h3>
                <div className="grid gap-4">
                  <button
                    type="button"
                    className="h-32 flex flex-col items-center justify-center relative border-2 border-gray-300 rounded-lg hover:border-[#F05023] transition-colors"
                    onClick={() => startCamera("sign")}
                    disabled={isCompressing}
                  >
                    <Camera className="h-8 w-8 mb-2" />
                    <span>Foto del Rótulo</span>
                    {form.watch("images.sign") && (
                      <>
                        <img
                          src={form.watch("images.sign")}
                          alt="Sign Preview"
                          className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-50"
                        />
                        <button
                          type="button"
                          onClick={testOCR}
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white text-[#F05023] px-4 py-1 rounded-full text-sm shadow-md hover:bg-gray-50"
                        >
                          Verificar OCR
                        </button>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="h-32 flex flex-col items-center justify-center relative border-2 border-gray-300 rounded-lg hover:border-[#F05023] transition-colors"
                    onClick={() => startCamera("property")}
                    disabled={isCompressing}
                  >
                    <Camera className="h-8 w-8 mb-2" />
                    <span>Foto de la Propiedad</span>
                    {form.watch("images.property") && (
                      <img
                        src={form.watch("images.property")}
                        alt="Property Preview"
                        className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-50"
                      />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="button"
                className="w-full h-32 flex flex-col items-center justify-center border-2 border-gray-300 rounded-lg hover:border-[#F05023] transition-colors bg-white/95 backdrop-blur-sm"
                onClick={captureLocation}
              >
                <MapPin className="h-8 w-8 mb-2" />
                <span>Capturar Ubicación</span>
                {form.watch("location.lat") !== 0 && (
                  <span className="text-sm text-gray-600 mt-2">
                    Ubicación: {form.watch("location.lat").toFixed(6)}, {form.watch("location.lng").toFixed(6)}
                  </span>
                )}
              </button>

              <button
                type="submit"
                className="w-full bg-[#F05023] text-white py-3 rounded-md font-semibold disabled:opacity-50"
                disabled={isCompressing || createPropertyMutation.isPending}
              >
                {createPropertyMutation.isPending ? "Enviando..." : "Enviar Propiedad"}
              </button>
            </form>
          </Form>
        </div>
      </PhonePreview>

      <Dialog
        open={isCapturing}
        onOpenChange={(open) => {
          if (!open) cleanup();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCompressing ?
                "Compressing Image..." :
                `Capture ${activeCamera === "sign" ? "Sign" : "Property"} Photo`
              }
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {devices.length > 1 && (
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={capturePhoto}
                  disabled={isCompressing}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showOcrDialog} onOpenChange={setShowOcrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resultados del OCR</DialogTitle>
            <DialogDescription>
              Aquí están los resultados del procesamiento de la imagen del rótulo:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Texto Extraído:</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {ocrTestResult?.extractedText || "No se extrajo texto"}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Números de Teléfono Encontrados:</h4>
              {ocrTestResult?.phoneNumbers?.length ? (
                <ul className="list-disc list-inside">
                  {ocrTestResult.phoneNumbers.map((phone, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{phone}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No se encontraron números de teléfono</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}