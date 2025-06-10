import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, QrCode, Share2, Download, Smartphone, Globe, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";

export default function ShareAppPage() {
  const [, setLocation] = useLocation();
  const [showQR, setShowQR] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateQR = () => {
    if (!canvasRef.current) return;
    
    // Verificar si QRCode ya está disponible
    if ((window as any).QRCode) {
      createQRCode();
    } else {
      // Cargar la librería si no está disponible
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
      script.onload = createQRCode;
      script.onerror = () => {
        console.error('Error al cargar la librería QR');
        // Fallback: mostrar un mensaje alternativo
        showQRFallback();
      };
      document.head.appendChild(script);
    }
  };

  const createQRCode = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const currentUrl = window.location.origin;
    console.log('Generando QR para URL:', currentUrl);
    
    try {
      (window as any).QRCode.toCanvas(canvas, currentUrl, {
        width: 250,
        height: 250,
        color: {
          dark: '#F05023',
          light: '#FFFFFF'
        },
        margin: 2,
        errorCorrectionLevel: 'M'
      }, function (error: any) {
        if (error) {
          console.error('Error generando QR:', error);
          showQRFallback();
          return;
        }
        
        // Agregar logo VA en el centro
        setTimeout(() => {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          const logoSize = 50;
          const x = (canvas.width - logoSize) / 2;
          const y = (canvas.height - logoSize) / 2;
          
          // Fondo blanco para el logo
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x - 8, y - 8, logoSize + 16, logoSize + 16);
          
          // Logo VA
          ctx.fillStyle = '#F05023';
          ctx.fillRect(x, y, logoSize, logoSize);
          
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('VA', x + logoSize/2, y + logoSize/2);
          
          console.log('QR Code generado exitosamente');
        }, 100);
      });
    } catch (error) {
      console.error('Error en createQRCode:', error);
      showQRFallback();
    }
  };

  const showQRFallback = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Configurar canvas
    canvas.width = 250;
    canvas.height = 250;
    
    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 250, 250);
    
    // Borde
    ctx.strokeStyle = '#F05023';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 230, 230);
    
    // Texto informativo
    ctx.fillStyle = '#F05023';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Código QR', 125, 100);
    ctx.fillText('no disponible', 125, 125);
    ctx.fillText('Usa el enlace', 125, 150);
    ctx.fillText('que aparece abajo', 125, 175);
  };

  const shareApp = async () => {
    const shareData = {
      title: 'Virtual Agent - Gestión de Propiedades',
      text: '¡Descarga Virtual Agent para gestionar tus propiedades inmobiliarias de forma profesional!',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        alert('✅ Enlace copiado al portapapeles');
      }
    } catch (error) {
      try {
        await navigator.clipboard.writeText(window.location.origin);
        alert('✅ Enlace copiado al portapapeles');
      } catch (clipboardError) {
        console.error('Error al compartir:', error);
      }
    }
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.download = 'virtual-agent-qr-compartir.png';
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.origin)}&color=F05023&bgcolor=FFFFFF&margin=10&ecc=M`;
    link.click();
  };

  useEffect(() => {
    if (showQR) {
      generateQR();
    }
  }, [showQR]);

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
          <div className="w-5"></div>
        </div>
      </header>

      <div className="p-4 bg-cover bg-center bg-no-repeat" style={{backgroundImage: 'url("/assets/ciudad.jpeg")'}}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center">
              <Share2 className="w-6 h-6 text-orange-500" />
              Comparte Virtual Agent
            </CardTitle>
            <p className="text-center text-gray-600">
              Ayuda a otros a descubrir esta increíble herramienta de gestión inmobiliaria
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-2xl shadow-xl border border-orange-200">
              
              {/* Encabezado principal */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-full mb-4 shadow-lg">
                  <QrCode className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">¡Invita a más usuarios!</h2>
                <p className="text-gray-600 text-lg">Comparte este código QR para que otros accedan a Virtual Agent</p>
                
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
                  <p className="text-sm text-green-700">
                    <span className="font-semibold">✅ Listo:</span> Comparte Virtual Agent con otros profesionales inmobiliarios para expandir tu red de contactos.
                  </p>
                </div>
              </div>

              {/* Código QR */}
              <div className="flex justify-center mb-8">
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-3xl shadow-2xl border-4 border-orange-200 max-w-xs mx-auto">
                  <div className="w-full aspect-square relative">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin)}&color=F05023&bgcolor=FFFFFF&margin=10&ecc=M`}
                      alt="Código QR para Virtual Agent"
                      className="w-full h-full object-contain rounded-lg"
                      style={{ 
                        imageRendering: 'crisp-edges',
                        maxWidth: '100%',
                        maxHeight: '100%'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Instrucciones paso a paso */}
              <div className="space-y-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-orange-200 shadow-lg">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center text-lg">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</div>
                    Escaneo del Código QR
                  </h3>
                  <div className="ml-11 space-y-2">
                    <div className="flex items-center text-gray-700">
                      <Smartphone className="w-4 h-4 mr-2 text-orange-500" />
                      <span>Abre la aplicación de cámara en tu dispositivo móvil</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <QrCode className="w-4 h-4 mr-2 text-orange-500" />
                      <span>Apunta la cámara hacia este código QR</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <CheckCircle className="w-4 h-4 mr-2 text-orange-500" />
                      <span>Toca la notificación que aparece en pantalla</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-orange-200 shadow-lg">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center text-lg">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</div>
                    Instalación como App
                  </h3>
                  <div className="ml-11 space-y-3">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <div className="flex items-start">
                        <Globe className="w-5 h-5 mr-3 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-blue-900 mb-2">📱 Para iPhone (Safari):</p>
                          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Abre el enlace en Safari (no Chrome)</li>
                            <li>Toca el botón de "Compartir" (cuadrito con flecha hacia arriba)</li>
                            <li>Desliza hacia abajo y busca "Agregar a pantalla de inicio"</li>
                            <li>Toca "Agregar" en la esquina superior derecha</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                      <div className="flex items-start">
                        <Globe className="w-5 h-5 mr-3 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-semibold text-green-900 mb-2">🤖 Para Android (Chrome):</p>
                          <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                            <li>Abre el enlace en Chrome</li>
                            <li>Toca el menú (tres puntos verticales)</li>
                            <li>Selecciona "Instalar aplicación" o "Agregar a pantalla de inicio"</li>
                            <li>Confirma la instalación</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-gray-700 mt-4">
                      <CheckCircle className="w-4 h-4 mr-2 text-orange-500" />
                      <span className="font-medium">¡Virtual Agent quedará instalada como una app nativa!</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-2xl border border-orange-200 shadow-lg">
                  <h3 className="font-bold text-orange-800 mb-3 text-lg">🔗 Enlace Directo</h3>
                  <div className="bg-white p-4 rounded-xl border border-orange-200 mb-3">
                    <p className="text-sm font-mono text-gray-700 break-all select-all">
                      {window.location.origin}
                    </p>
                  </div>
                  <p className="text-sm text-orange-700">
                    También puedes copiar y enviar este enlace por WhatsApp, email o cualquier otra app de mensajería.
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button 
                  onClick={shareApp}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-4 text-lg rounded-xl shadow-lg"
                >
                  <Share2 className="mr-2 h-5 w-5" />
                  Compartir Enlace
                </Button>
                <Button 
                  onClick={downloadQR}
                  variant="outline"
                  className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50 py-4 text-lg rounded-xl shadow-lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Descargar QR
                </Button>
              </div>

              {/* Footer */}
              <div className="text-center pt-4 border-t border-orange-200">
                <div className="inline-flex items-center text-gray-600">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                    <span className="text-white font-bold">VA</span>
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Virtual Agent</div>
                    <div className="text-sm text-gray-500">Gestión Profesional de Propiedades</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}