import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertySchema } from "@shared/schema";
import { Camera, MapPin, X } from "lucide-react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import imageCompression from "browser-image-compression";

export default function PropertyEntry() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeCamera, setActiveCamera] = useState<"sign" | "property" | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const form = useForm({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      propertyType: "",
      signPhoneNumber: "",
      location: { lat: 0, lng: 0 },
      propertyId: "",
      images: { sign: "", property: "" }
    }
  });

  // Handle camera access
  const startCamera = async (type: "sign" | "property") => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      setStream(mediaStream);
      setActiveCamera(type);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera Error",
        description: "Unable to access device camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  // Compress image
  const compressImage = async (imageDataUrl: string): Promise<string> => {
    try {
      setIsCompressing(true);

      // Convert base64 to blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      // Compression options
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        onProgress: (progress: number) => {
          console.log('Compression progress:', progress);
        }
      };

      // Compress the image
      const compressedFile = await imageCompression(blob, options);

      // Convert compressed blob back to base64
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
        variant: "destructive"
      });
      return imageDataUrl;
    } finally {
      setIsCompressing(false);
    }
  };

  // Handle photo capture
  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current && activeCamera) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg');

      // Compress the image before storing
      const compressedImage = await compressImage(imageData);
      form.setValue(`images.${activeCamera}`, compressedImage);

      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setActiveCamera(null);

      // Show success message with compression info
      const originalSize = Math.round(imageData.length / 1024);
      const compressedSize = Math.round(compressedImage.length / 1024);
      const savings = Math.round(((originalSize - compressedSize) / originalSize) * 100);

      toast({
        title: "Photo Captured",
        description: `Image compressed from ${originalSize}KB to ${compressedSize}KB (${savings}% reduction)`,
      });
    }
  };

  // Handle location capture
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
      // Submit logic here
      toast({
        title: "Property Added",
        description: "Property has been successfully added for analysis"
      });
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add property",
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

              <Button type="submit" className="w-full" disabled={isCompressing}>
                Submit Property
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={!!activeCamera} onOpenChange={() => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
        setActiveCamera(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCompressing ? 
                "Compressing Image..." : 
                `Capture ${activeCamera === "sign" ? "Sign" : "Property"} Photo`
              }
            </DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2"
              onClick={capturePhoto}
              disabled={isCompressing}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}