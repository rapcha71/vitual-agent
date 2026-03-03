import { useState, useEffect, useCallback } from "react";
import { X, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): "ios" | "android" | "other" {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/i.test(ua);
  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return "other";
}

function isRunningAsInstalledPWA(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isRunningAsInstalledPWA()) return;

    const dismissed = sessionStorage.getItem("pwa-banner-dismissed");
    if (dismissed) return;

    const detected = detectPlatform();
    setPlatform(detected);

    if (detected === "ios") {
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  }, []);

  const handleInstallAndroid = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setInstalling(false);
    if (result.outcome === "accepted") {
      setVisible(false);
      sessionStorage.setItem("pwa-banner-dismissed", "1");
    }
  }, [deferredPrompt]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes pulse-logo {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(213,0,115,0.4); }
          50%       { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(213,0,115,0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .pwa-banner {
          animation: slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .logo-pulse {
          animation: pulse-logo 2s ease-in-out infinite;
        }
        .btn-shimmer {
          background-size: 200% auto;
          animation: shimmer 2.5s linear infinite;
        }
      `}</style>

      <div
        className="pwa-banner"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          padding: "0 12px 12px",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #1a0a12 0%, #2d0f22 50%, #1a1a0a 100%)",
            borderRadius: "24px 24px 20px 20px",
            boxShadow: "0 -4px 40px rgba(213,0,115,0.35), 0 8px 32px rgba(0,0,0,0.5)",
            border: "1px solid rgba(213,0,115,0.3)",
            padding: "20px",
            pointerEvents: "all",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative glow blobs */}
          <div style={{
            position: "absolute", top: -30, left: -30, width: 120, height: 120,
            borderRadius: "50%", background: "rgba(213,0,115,0.12)", filter: "blur(24px)", pointerEvents: "none"
          }} />
          <div style={{
            position: "absolute", bottom: -20, right: -20, width: 100, height: 100,
            borderRadius: "50%", background: "rgba(166,216,0,0.10)", filter: "blur(20px)", pointerEvents: "none"
          }} />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            style={{
              position: "absolute", top: 12, right: 12,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "50%", width: 30, height: 30,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.6)",
            }}
          >
            <X size={14} />
          </button>

          {/* Header row: logo + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div
              className="logo-pulse"
              style={{
                width: 60, height: 60, borderRadius: 16, overflow: "hidden",
                flexShrink: 0, border: "2px solid rgba(213,0,115,0.6)",
                background: "#fff",
              }}
            >
              <img
                src="/assetsicon-512.png"
                alt="Virtual Agent"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            <div>
              <p style={{
                margin: 0, fontWeight: 800, fontSize: 18,
                background: "linear-gradient(90deg, #D50073, #A6D800)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.3px",
              }}>
                Virtual Agent
              </p>
              <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
                {platform === "ios"
                  ? "¡Llevá la app en tu iPhone!"
                  : "¡Instalá la app en tu Android!"}
              </p>
            </div>
          </div>

          {platform === "android" && (
            <button
              onClick={handleInstallAndroid}
              disabled={installing}
              className="btn-shimmer"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                border: "none",
                cursor: installing ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 16,
                color: "#fff",
                background: installing
                  ? "rgba(213,0,115,0.5)"
                  : "linear-gradient(90deg, #D50073 0%, #ff2d9b 50%, #D50073 100%)",
                boxShadow: "0 4px 20px rgba(213,0,115,0.5)",
                letterSpacing: "0.3px",
              }}
            >
              {installing ? "Instalando…" : "⬇ Instalar Virtual Agent"}
            </button>
          )}

          {platform === "ios" && (
            <div style={{
              background: "rgba(255,140,0,0.10)",
              border: "1px solid rgba(255,140,0,0.30)",
              borderRadius: 16,
              padding: "14px 16px",
            }}>
              <p style={{
                margin: "0 0 10px",
                color: "#ffaa44",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
              }}>
                Cómo instalar en iOS
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: "rgba(255,140,0,0.15)", border: "1px solid rgba(255,140,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Share size={16} color="#ff9922" />
                  </div>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.4 }}>
                    Tocá el ícono <strong style={{ color: "#ffaa44" }}>Compartir</strong> (cuadrado con flecha ↑) en la barra inferior de Safari
                  </p>
                </div>

                <div style={{
                  height: 1, background: "rgba(255,140,0,0.15)", margin: "0 0",
                }} />

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10,
                    background: "rgba(255,140,0,0.15)", border: "1px solid rgba(255,140,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Plus size={16} color="#ff9922" />
                  </div>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.4 }}>
                    Seleccioná <strong style={{ color: "#ffaa44" }}>"Agregar a inicio"</strong> y tocá <em>Agregar</em>
                  </p>
                </div>
              </div>
            </div>
          )}

          <p style={{
            margin: "12px 0 0", textAlign: "center",
            color: "rgba(255,255,255,0.3)", fontSize: 11,
          }}>
            Acceso rápido · Sin tienda de apps · Funciona sin conexión
          </p>
        </div>
      </div>
    </>
  );
}
