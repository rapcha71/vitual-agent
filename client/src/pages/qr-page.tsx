import { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";

export default function QRPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Cargar la librería QR dinámicamente
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
    script.onload = () => {
      generateQR();
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const generateQR = () => {
    if (!canvasRef.current) return;
    
    const currentUrl = window.location.origin;
    
    // @ts-ignore - QRCode se carga dinámicamente
    window.QRCode.toCanvas(canvasRef.current, currentUrl, {
      width: 200,
      height: 200,
      color: {
        dark: '#F05023',
        light: '#FFFFFF'
      },
      margin: 2,
      errorCorrectionLevel: 'M'
    }, function (error: any) {
      if (error) {
        console.error(error);
        return;
      }
      
      // Agregar el logo en el centro
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const logoSize = 40;
      const x = (canvas.width - logoSize) / 2;
      const y = (canvas.height - logoSize) / 2;
      
      // Crear fondo blanco para el logo
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 5, y - 5, logoSize + 10, logoSize + 10);
      
      // Crear el logo VA
      ctx.fillStyle = '#F05023';
      ctx.fillRect(x, y, logoSize, logoSize);
      
      // Agregar texto VA
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VA', x + logoSize/2, y + logoSize/2);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-orange-500 to-orange-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6">
          VA
        </div>
        
        {/* Título */}
        <h1 className="text-3xl font-bold text-primary mb-2">Virtual Agent</h1>
        <p className="text-gray-600 mb-8">Tu llave de ingreso a los bienes raíces</p>
        
        {/* Código QR */}
        <div className="bg-white p-6 rounded-2xl shadow-lg inline-block mb-6">
          <canvas ref={canvasRef} className="block"></canvas>
        </div>
        
        {/* URL */}
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6 font-mono text-sm text-gray-700 break-all">
          {window.location.origin}
        </div>
        
        {/* Instrucciones */}
        <div className="text-left bg-gray-50 rounded-lg p-4">
          <p className="font-semibold text-primary mb-2">¿Cómo usar este código QR?</p>
          <ol className="text-sm text-gray-700 space-y-1">
            <li>1. Abre la cámara de tu teléfono</li>
            <li>2. Apunta al código QR</li>
            <li>3. Toca la notificación que aparece</li>
            <li>4. ¡Instala Virtual Agent como PWA!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}