import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ChevronLeft, LogOut } from "lucide-react";
import { useLocation } from "wouter";


export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

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

        <div className="p-4 bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url("/assets/ciudad.jpeg")'}}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-6 h-6" />
                Perfil de Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Información del Usuario</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Usuario:</span>
                  <span>{user?.username}</span>
                  <span className="text-muted-foreground">Nombre Completo:</span>
                  <span>{user?.fullName || 'No establecido'}</span>
                  <span className="text-muted-foreground">Teléfono:</span>
                  <span>{user?.mobile || 'No establecido'}</span>
                  <span className="text-muted-foreground">Alias:</span>
                  <span>{user?.nickname || 'No establecido'}</span>
                  <span className="text-muted-foreground">Último Acceso:</span>
                  <span>{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Nunca'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}