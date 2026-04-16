import { Button } from "@/components/ui/button";
import { PWAInstallButton } from "@/components/ui/pwa-install-button";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Plus, LogOut, ChevronLeft, Shield, User, Building, Share2, MessageCircle, BellRing } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PhonePreview } from "@/components/ui/phone-preview";
import { RegulationsDialog } from "@/components/ui/regulations-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const ITEMS_PER_PAGE = 5;

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/messages/unread/count'],
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count || 0;
  const hasUnread = unreadCount > 0;

  // Badge API: muestra/limpia el contador en el ícono de la app instalada
  // Funciona como WhatsApp/Gmail en Android y Chrome desktop
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    if (hasUnread) {
      (navigator as any).setAppBadge(unreadCount).catch(() => {});
    } else {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  }, [hasUnread, unreadCount]);

  const paginatedProperties = properties.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = properties.length > paginatedProperties.length;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        {/* Removed PhonePreview from here */}
        <div className="flex flex-col h-full bg-white w-full max-w-md mx-auto">
            <header className="bg-[#F05023] px-4 py-3 flex-none">
              <div className="flex items-center justify-center">
                <img
                  src="/assets/logo-full.png"
                  alt="Virtual Agent"
                  className="h-[96px] w-auto object-contain header-logo-2x" style={{ maxWidth: 'none' }}
                />
              </div>
            </header>
            <main className="flex-1 p-4 space-y-4 flex flex-col items-center justify-center">
              <h1 className="text-2xl font-bold text-center">
                Bienvenido a Virtual Agent
              </h1>
              <p className="text-center text-muted-foreground">
                Inicia sesión para administrar tus propiedades
              </p>
              <div className="w-full max-w-sm">
                <Link href="/auth">
                  <Button
                    className="w-full transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]"
                  >
                    Iniciar Sesión
                  </Button>
                </Link>
              </div>
            </main>
          </div>
      </div>
    );
  }

  return (
    <div className="full-screen-layout bg-gray-100">
      <div className="flex flex-col h-full w-full">
          <header className="bg-[#F05023] px-4 py-3 flex-none">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                className="text-white hover:text-white/80 p-0 relative z-10"
                onClick={() => window.history.back()}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center">
                <img
                  src="/assets/logo-full.png"
                  alt="Virtual Agent"
                  className="h-14 w-auto max-w-[60vw] object-contain header-logo-2x"
                  loading="eager"
                />
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <PWAInstallButton />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-white/80 p-0"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          <main
            className="flex-1 overflow-y-auto bg-cover bg-center bg-fixed"
            style={{
              backgroundImage: 'url("/assets/ciudad-optimized.webp")',
              minHeight: 'calc(100vh - 64px)'
            }}
          >
            <div className="min-h-full p-4 space-y-4 backdrop-blur-[2px] content-wrapper">
              {/* Welcome Section */}
              <div className="space-y-2 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-sm">
                <h1 className="text-xl font-bold">
                  Bienvenido, {user?.fullName || user?.nickname || user?.username}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Administra y rastrea tus propiedades en un solo lugar
                </p>
                <div className="flex flex-col gap-2">
                  <Link href="/property/new">
                    <Button className="w-full transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_10px_rgba(240,80,35,0.3)] hover:shadow-[6px_6px_15px_rgba(240,80,35,0.4)]">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Propiedad
                    </Button>
                  </Link>
                  {user?.isAdmin && (
                    <Link href="/admin">
                      <Button variant="outline" className="w-full bg-white nav-option-orange">
                        <Shield className="h-4 w-4 mr-2" />
                        Panel de Administración
                      </Button>
                    </Link>
                  )}
                  <RegulationsDialog />
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="grid grid-cols-2 gap-3">
                <Link href="/properties">
                  <Button
                    variant="outline"
                    className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm bg-white nav-option-orange"
                  >
                    <Building className="h-4 w-4" />
                    <span>Propiedades</span>
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button
                    variant="outline"
                    className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm bg-white nav-option-orange"
                  >
                    <User className="h-4 w-4" />
                    <span>Perfil</span>
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm bg-white nav-option-orange"
                  >
                    <Building className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                <Link href="/messages">
                  <Button
                    variant={hasUnread ? "default" : "outline"}
                    className={`w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm relative transition-all duration-300 ${
                      hasUnread
                        ? 'bg-[#F05023] hover:bg-[#E04015] text-white border-0 shadow-[0_0_20px_rgba(240,80,35,0.5)] animate-pulse'
                        : 'bg-white nav-option-orange'
                    }`}
                  >
                    {hasUnread ? (
                      <BellRing className="h-5 w-5 animate-bounce" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    <span className={hasUnread ? 'font-bold text-xs' : ''}>
                      {hasUnread
                        ? (unreadCount === 1 ? '¡Tienes un mensaje!' : `¡${unreadCount} mensajes!`)
                        : 'Mensajes'
                      }
                    </span>
                    {hasUnread && (
                      <span className="absolute top-1 right-1 bg-white text-[#F05023] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-full flex flex-col items-center justify-center py-4 px-2 gap-1 text-sm bg-white nav-option-orange"
                    >
                      <Share2 className="h-4 w-4" />
                      <span>Compartir App</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-[#FFF5F2] border-[#F05023]/20 [&>*]:bg-[#FFF5F2] [&_button]:text-[#F05023] [&_button]:hover:bg-[#F05023]/10 [&_button]:border-[#F05023]">
                    <DialogHeader className="bg-[#FFF5F2]">
                      <DialogTitle className="text-[#F05023]">Compartir Virtual Agent</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center space-y-4 p-4 bg-[#FFF5F2]">
                      <img 
                        src="/assets/qr-virtualagent.png"
                        alt="Código QR de Virtual Agent"
                        className="w-64 h-64 rounded-lg p-2"
                      />
                      <p className="text-sm text-center text-[#F05023] font-medium">
                        Escanea este código QR para acceder a Virtual Agent
                      </p>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin).then(() => {
                            alert('Enlace copiado al portapapeles');
                          });
                        }}
                        variant="outline"
                        className="w-full border-[#F05023] text-[#F05023] hover:bg-[#F05023]/10 hover:text-[#F05023]"
                      >
                        Copiar Enlace
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Properties List */}
              {isLoading ? (
                <div className="flex justify-center py-4 bg-white/90 backdrop-blur-sm rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : paginatedProperties.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm">
                    Tus Propiedades
                  </h2>
                  <div className="space-y-3">
                    {paginatedProperties.map((property) => (
                      <Card key={property.id} className="bg-white/90 backdrop-blur-sm shadow-sm">
                        <CardHeader className="p-3">
                          <CardTitle className="text-base">
                            {property.propertyType === 'house' ? 'Casa' :
                             property.propertyType === 'land' ? 'Terreno' :
                             'Local Comercial'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">
                              ID: {property.propertyId}
                            </p>
                            {property.signPhoneNumber && (
                              <p className="text-muted-foreground">
                                Contacto: {property.signPhoneNumber}
                              </p>
                            )}
                            <p className="text-muted-foreground">
                              Ubicación: {property.location && `${property.location.lat.toFixed(7)}, ${property.location.lng.toFixed(7)}`}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {hasMore && (
                      <Button
                        variant="outline"
                        className="w-full mt-4 bg-white/90 backdrop-blur-sm"
                        onClick={() => setPage(p => p + 1)}
                      >
                        Cargar más propiedades
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
                  <p className="text-muted-foreground">No tienes propiedades registradas</p>
                </div>
              )}
            </div>
          </main>
        </div>
    </div>
  );
}