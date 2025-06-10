import { useEffect, useState } from 'react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  const [logoScale, setLogoScale] = useState(0);
  const [showText, setShowText] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    // Secuencia de animaciones
    const logoTimer = setTimeout(() => {
      setLogoScale(1); // Logo aparece y crece
    }, 200);

    const textTimer = setTimeout(() => {
      setShowText(true); // Texto aparece después del logo
    }, 800);

    const spinnerTimer = setTimeout(() => {
      setShowSpinner(true); // Spinner aparece al final
    }, 1200);

    const exitTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Delay for fade out animation
    }, 4000); // Show splash for 4 seconds

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(textTimer);
      clearTimeout(spinnerTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500"
      style={{ 
        backgroundColor: '#FFF0E6', // Light orange background, more visible than before
        opacity: isVisible ? 1 : 0 
      }}
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Logo de Virtual Agent con animación */}
        <div className="w-80 h-20 flex items-center justify-center">
          <img
            src="/virtual-agent-logo.png"
            alt="Virtual Agent"
            className="max-w-full max-h-full object-contain transition-all duration-700 ease-out"
            style={{ 
              transform: `scale(${logoScale})`,
              opacity: logoScale,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
            }}
          />
        </div>
        
        {/* Texto descriptivo con animación */}
        <p 
          className={`text-gray-700 text-lg font-light text-center px-8 transition-all duration-500 ${
            showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Tu llave de ingreso a los bienes raíces
        </p>
        
        {/* Indicador de carga con animación */}
        <div className="mt-8 h-8 flex items-center justify-center">
          <div 
            className={`w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full transition-all duration-300 ${
              showSpinner ? 'opacity-100 animate-spin' : 'opacity-0'
            }`}
          ></div>
        </div>
      </div>
    </div>
  );
}