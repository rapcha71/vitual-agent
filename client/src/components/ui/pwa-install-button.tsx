
import { Button } from "./button";
import { Download, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useToast } from "@/hooks/use-toast";

export function PWAInstallButton() {
  const { isInstallable, isInstalled, installPWA } = usePWAInstall();
  const { toast } = useToast();

  const handleInstall = async () => {
    const success = await installPWA();
    if (success) {
      toast({
        title: "¡Aplicación instalada!",
        description: "Virtual Agent se ha agregado a tu pantalla de inicio.",
      });
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <Smartphone className="h-4 w-4" />
        <span>App instalada</span>
      </div>
    );
  }

  if (!isInstallable) {
    return null;
  }

  return (
    <Button
      onClick={handleInstall}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 border-[#F05023] text-[#F05023] hover:bg-[#F05023] hover:text-white"
    >
      <Download className="h-4 w-4" />
      Instalar App
    </Button>
  );
}
