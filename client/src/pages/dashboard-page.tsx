import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Property, Message } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Plus, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient } from "@/lib/queryClient";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const { data: messages = [] } = useQuery<(Message & { sender: { fullName: string } })[]>({
    queryKey: ['/api/messages'],
  });

  const { data: unreadCount = 0 } = useQuery<{ count: number }>({
    queryKey: ['/api/messages/unread/count'],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Error al marcar el mensaje como leído');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread/count'] });
    },
  });

  const propertyCounts = {
    house: properties.filter(p => p.propertyType === 'house').length,
    land: properties.filter(p => p.propertyType === 'land').length,
    commercial: properties.filter(p => p.propertyType === 'commercial').length,
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
                className="h-10 md:h-12 lg:h-14 w-auto"
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

        <main className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Bienvenido, {user?.fullName}</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="relative"
                >
                  <MessageCircle className="h-4 w-4" />
                  {(typeof unreadCount === 'object' && unreadCount && unreadCount.count > 0) && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
                    >
                      {typeof unreadCount === 'object' && unreadCount ? unreadCount.count : 0}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mensajes del Administrador</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <Card 
                        key={message.id}
                        className={`transition-colors ${
                          message.unreadByUsers.includes(user?.id || 0)
                            ? "bg-blue-50"
                            : ""
                        }`}
                        onClick={() => {
                          if (message.unreadByUsers.includes(user?.id || 0)) {
                            markAsReadMutation.mutate(message.id);
                          }
                        }}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-sm font-medium">
                              {message.sender.fullName}
                            </CardTitle>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            </div>

          <Button onClick={() => setLocation("/property/new")} className="transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Propiedad
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Mis Propiedades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Card className="flex flex-col justify-center items-center h-[120px]">
                  <CardHeader className="pb-0 pt-2 space-y-0">
                    <CardTitle className="text-sm">Casas</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center py-2">
                    <p className="text-2xl font-bold">{propertyCounts.house}</p>
                  </CardContent>
                </Card>
                <Card className="flex flex-col justify-center items-center h-[120px]">
                  <CardHeader className="pb-0 pt-2 space-y-0">
                    <CardTitle className="text-sm">Terrenos</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center py-2">
                    <p className="text-2xl font-bold">{propertyCounts.land}</p>
                  </CardContent>
                </Card>
                <Card className="flex flex-col justify-center items-center h-[120px]">
                  <CardHeader className="pb-0 pt-2 space-y-0">
                    <CardTitle className="text-sm">Comercial</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center py-2">
                    <p className="text-2xl font-bold">{propertyCounts.commercial}</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </main>
    </div>
  );
}