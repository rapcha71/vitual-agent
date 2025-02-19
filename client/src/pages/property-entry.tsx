import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertySchema } from "@shared/schema";
import { Camera, MapPin, X, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import imageCompression from "browser-image-compression";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";

// Define marker colors based on property type
const MarkerColors = {
  house: 'blue',
  land: 'green',
  commercial: 'yellow'
} as const;

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

  const form = useForm({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      propertyType: "",
      signPhoneNumber: "",
      location: { lat: 0, lng: 0 },
      propertyId: nanoid(),
      images: { sign: "", property: "" },
      markerColor: ""
    }
  });

  // Update the createPropertyMutation to handle the API request properly
  const createPropertyMutation = useMutation({
    mutationFn: async (formData: any) => {
      console.log("Starting property submission...");

      // Get marker color based on property type
      const propertyData = {
        ...formData,
        markerColor: MarkerColors[formData.propertyType as keyof typeof MarkerColors]
      };

      // Show loading toast
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
          body: JSON.stringify(propertyData),
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to submit property');
        }

        return data;
      } catch (error: any) {
        console.error("Submission error:", error);
        throw new Error(error.message || 'Failed to submit property');
      }
    },
    onSuccess: (data) => {
      console.log("Property submission successful:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });

      toast({
        title: "Success!",
        description: "Property has been successfully added",
        duration: 5000,
      });

      setLocation("/");
    },
    onError: (error: Error) => {
      console.error("Property submission error:", error);
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

      // Close the dialog after successful capture
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
        maxSizeMB: 5,
        maxWidthOrHeight: 2560,
        useWebWorker: true,
        onProgress: (progress: number) => {
          console.log('Compression progress:', progress);
        }
      };

      const compressedFile = await imageCompression(file, options);

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

      // Validate required fields
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

      // Submit the form
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

  return (
    <div className="min-h-screen bg-background p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add New Property</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="propertyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                        <SelectItem value="commercial">Commercial Premise</SelectItem>
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
                    <FormLabel>Sign Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <h3 className="font-medium">Property Photos</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-32 flex flex-col items-center justify-center relative"
                    onClick={() => startCamera("sign")}
                    disabled={isCompressing}
                  >
                    <Camera className="h-8 w-8 mb-2" />
                    <span>Capture Sign Photo</span>
                    {form.watch("images.sign") && (
                      <img
                        src={form.watch("images.sign")}
                        alt="Sign Preview"
                        className="absolute inset-0 w-full h-full object-cover rounded-md opacity-50"
                      />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-32 flex flex-col items-center justify-center relative"
                    onClick={() => startCamera("property")}
                    disabled={isCompressing}
                  >
                    <Camera className="h-8 w-8 mb-2" />
                    <span>Capture Property Photo</span>
                    {form.watch("images.property") && (
                      <img
                        src={form.watch("images.property")}
                        alt="Property Preview"
                        className="absolute inset-0 w-full h-full object-cover rounded-md opacity-50"
                      />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Location</h3>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-32 flex flex-col items-center justify-center"
                  onClick={captureLocation}
                >
                  <MapPin className="h-8 w-8 mb-2" />
                  <span>Capture Location</span>
                  {form.watch("location.lat") !== 0 && (
                    <span className="text-sm text-muted-foreground mt-2">
                      Location captured: {form.watch("location.lat").toFixed(6)}, {form.watch("location.lng").toFixed(6)}
                    </span>
                  )}
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isCompressing || createPropertyMutation.isPending}
              >
                {createPropertyMutation.isPending ? "Submitting..." : "Submit Property"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

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
    </div>
  );
}