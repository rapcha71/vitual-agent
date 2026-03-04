import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Property, Message, insertMessageSchema, InsertMessage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, LogOut, Plus, MessageCircle, Share2, Home, User, BarChart, Send, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [contactAdminDialogOpen, setContactAdminDialogOpen] = useState(false);

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

  const contactAdminForm = useForm<InsertMessage>({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: {
      content: "",
    }
  });

  const sendToAdminMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      const response = await fetch('/api/messages/to-admin', {
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
        description: "Tu mensaje ha sido enviado al administrador",
      });
      contactAdminForm.reset();
      setContactAdminDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSendToAdmin = async (data: InsertMessage) => {
    try {
      await sendToAdminMutation.mutateAsync(data);
    } catch (error) {
      console.error('Error sending message to admin:', error);
    }
  };



  return (
    <div className="full-screen-layout bg-white">
      <header className="page-header">
        <div className="flex items-center justify-between content-wrapper">
          <Button
            variant="ghost"
            className="text-white hover:text-white/80 p-0"
            onClick={() => setLocation("/")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <img
              src="/assets/logo-full.png"
              alt="Virtual Agent"
              className="h-14 w-auto max-w-[60vw] object-contain"
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

      <main className="page-content space-y-4 content-wrapper">
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
                {unreadCount?.count > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
                  >
                    {unreadCount?.count}
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
                        {message.imageUrl && (
                          <div className="mt-2">
                            <img 
                              src={message.imageUrl} 
                              alt="Imagen adjunta" 
                              className="max-w-full max-h-48 rounded-md cursor-pointer hover:opacity-90"
                              onClick={() => window.open(message.imageUrl!, '_blank')}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Grupo de 3 botones principales */}
        <div className="grid grid-cols-3 gap-4">
          <Button
            onClick={() => setLocation("/properties")}
            className="h-20 flex flex-col items-center justify-center space-y-1 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]"
          >
            <Home className="h-6 w-6" />
            <span className="text-sm">Propiedades</span>
          </Button>

          <Button
            onClick={() => setLocation("/profile")}
            className="h-20 flex flex-col items-center justify-center space-y-1 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]"
          >
            <User className="h-6 w-6" />
            <span className="text-sm">Perfil</span>
          </Button>

          <Button
            onClick={() => setLocation("/dashboard")}
            className="h-20 flex flex-col items-center justify-center space-y-1 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]"
          >
            <BarChart className="h-6 w-6" />
            <span className="text-sm">Dashboard</span>
          </Button>

        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="h-20 flex flex-col items-center justify-center space-y-1 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]"
            >
              <Share2 className="h-6 w-6" />
              <span className="text-sm">Compartir App</span>
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
                    alert('Enlace copiado al portapapeles');
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

        {/* Botón para contactar al administrador */}
        <Dialog open={contactAdminDialogOpen} onOpenChange={setContactAdminDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="h-16 flex items-center justify-center space-x-2 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border-[#F05023] text-[#F05023] hover:bg-[#F05023] hover:text-white"
            >
              <Send className="h-5 w-5" />
              <span>Contactar Administrador</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white [&>*]:bg-white [&_button]:text-gray-900 [&_button]:hover:bg-gray-100">
            <DialogHeader className="bg-white">
              <DialogTitle className="text-gray-900">Enviar Mensaje al Administrador</DialogTitle>
            </DialogHeader>
            <Form {...contactAdminForm} className="bg-white">
              <form onSubmit={contactAdminForm.handleSubmit(handleSendToAdmin)} className="space-y-4 text-gray-900">
                <FormField
                  control={contactAdminForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tu mensaje</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escribe tu mensaje aquí..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={sendToAdminMutation.isPending}
                    className="min-w-[140px] transition-all duration-200 active:scale-95"
                  >
                    {sendToAdminMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Button onClick={() => setLocation("/property/new")} className="w-full transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Propiedad
        </Button>

        {user?.isAdmin && (
          <Button
            onClick={() => setLocation("/admin/web")}
            variant="outline"
            className="w-full border-[#F05023] text-[#F05023] hover:bg-[#F05023] hover:text-white transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]"
          >
            Panel de Administración
          </Button>
        )}

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