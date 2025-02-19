import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPropertySchema } from "@shared/schema";
import { Camera, MapPin } from "lucide-react";
import { useLocation } from "wouter";

export default function PropertyEntry() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);

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
                    className="h-32 flex flex-col items-center justify-center"
                    onClick={() => setIsCapturing(true)}
                  >
                    <Camera className="h-8 w-8 mb-2" />
                    <span>Capture Sign Photo</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-32 flex flex-col items-center justify-center"
                    onClick={() => setIsCapturing(true)}
                  >
                    <Camera className="h-8 w-8 mb-2" />
                    <span>Capture Property Photo</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Location</h3>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-32 flex flex-col items-center justify-center"
                  onClick={() => {
                    // Get current location
                  }}
                >
                  <MapPin className="h-8 w-8 mb-2" />
                  <span>Capture Location</span>
                </Button>
              </div>

              <Button type="submit" className="w-full">
                Submit Property
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
