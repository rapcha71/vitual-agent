import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Building2, Plus, LogOut, Home, MapPin, Building, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  // Fetch user's properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  // Count properties by type
  const propertyCounts = {
    house: properties.filter(p => p.propertyType === 'house').length,
    land: properties.filter(p => p.propertyType === 'land').length,
    commercial: properties.filter(p => p.propertyType === 'commercial').length
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between relative">
          <Button 
            variant="ghost" 
            className="absolute left-2 text-primary hover:text-primary/80"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="h-5 w-5" />
            Atrás
          </Button>
          <div className="flex items-center space-x-2 ml-16">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Virtual Agent</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.fullName || user?.nickname || user?.username}
            </span>
            <Button variant="destructive" size="sm" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Welcome Section */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome to Your Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage and track your properties in one place
              </p>
            </div>
            <Link href="/property/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </Link>
          </div>

          {/* Property Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Houses
                </CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{propertyCounts.house}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Land Plots
                </CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{propertyCounts.land}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Commercial Properties
                </CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{propertyCounts.commercial}</div>
              </CardContent>
            </Card>
          </div>

          {/* Properties List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Properties</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <Card key={property.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        ID: {property.propertyId}
                      </p>
                      {property.signPhoneNumber && (
                        <p className="text-sm text-muted-foreground">
                          Contact: {property.signPhoneNumber}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Location: {property.location.lat.toFixed(6)}, {property.location.lng.toFixed(6)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}