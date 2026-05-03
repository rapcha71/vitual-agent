import { LocationType } from "@shared/schema";
import { CANTON_BOUNDS } from "./canton-bounds";

// Haversine formula for calculating distance between two points on Earth
export function calculateDistance(point1: LocationType, point2: LocationType): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export function isWithinRadius(point1: LocationType, point2: LocationType, radiusMeters: number): boolean {
  return calculateDistance(point1, point2) <= radiusMeters;
}

// ─── Bounding box de Costa Rica ───────────────────────────────────────────────
const CR_LAT = { min: 8.0, max: 11.2 };
const CR_LNG = { min: -85.9, max: -82.6 };

export interface GeoResolution {
  /** Coordenadas válidas y dentro de CR */
  valid: boolean;
  /** Razón del rechazo (solo si valid=false) */
  reason?: string;
  /** Código de provincia detectado (ej: "01") — derivado de las coordenadas */
  province?: string;
  /** Código de cantón detectado (ej: "01-09") — derivado de las coordenadas */
  district?: string;
  /** Nombre legible del cantón detectado (ej: "Santa Ana") */
  cantonLabel?: string;
}

/**
 * Detecta automáticamente el cantón y provincia a partir de coordenadas GPS.
 *
 * LÓGICA CORRECTA: Las coordenadas son la fuente de verdad.
 * El sistema determina dónde está la propiedad — el usuario NO interviene.
 *
 * Flujo:
 *   1. Rechaza coords fuera de Costa Rica.
 *   2. Rechaza coords en (0,0) — punto por defecto sin GPS real.
 *   3. Itera sobre los bounding boxes de todos los cantones y
 *      retorna el primero que contiene el punto (coordenadas → cantón).
 *   4. Si ningún cantón coincide exactamente (zona fronteriza entre cajas)
 *      → acepta la coordenada como válida dentro de CR pero sin cantón fijo.
 *
 * @param lat Latitud del GPS
 * @param lng Longitud del GPS
 * @returns GeoResolution — incluye province y district detectados automáticamente
 */
export function detectLocationFromCoords(lat: number, lng: number): GeoResolution {
  // ── 1. Rechazo si está fuera de Costa Rica ────────────────────────────────
  if (
    lat < CR_LAT.min || lat > CR_LAT.max ||
    lng < CR_LNG.min || lng > CR_LNG.max
  ) {
    return {
      valid: false,
      reason:
        `El GPS reporta coordenadas fuera de Costa Rica ` +
        `(lat ${lat.toFixed(5)}, lng ${lng.toFixed(5)}). ` +
        `Verificá que el GPS del dispositivo esté activado, ` +
        `que no tengas una VPN activa y que estés físicamente en la propiedad.`,
    };
  }

  // ── 2. Rechazo si son coordenadas por defecto (0,0) ───────────────────────
  if (lat === 0 && lng === 0) {
    return {
      valid: false,
      reason:
        "Las coordenadas son 0,0 — no se ha capturado una ubicación GPS real. " +
        "Presioná 'Capturar ubicación' desde el lugar físico de la propiedad.",
    };
  }

  // ── 3. Detección automática de cantón por punto-en-bounding-box ───────────
  // Iteramos TODOS los cantones — las coordenadas determinan el resultado.
  // El campo que el usuario seleccionó en el formulario es IGNORADO aquí.
  for (const [districtCode, canton] of Object.entries(CANTON_BOUNDS)) {
    const inBox =
      lat >= canton.lat[0] && lat <= canton.lat[1] &&
      lng >= canton.lng[0] && lng <= canton.lng[1];

    if (inBox) {
      // Extraer código de provincia del código de cantón (primeros 2 dígitos)
      const province = districtCode.split("-")[0];
      return {
        valid: true,
        province,
        district: districtCode,
        cantonLabel: canton.label,
      };
    }
  }

  // ── 4. Punto dentro de CR pero no en ningún bounding box conocido ─────────
  // (zonas de frontera entre cajas, costa, isla, etc.)
  // → Aceptar como válido dentro de CR pero sin cantón automático.
  return {
    valid: true,
    province: undefined,
    district: undefined,
    cantonLabel: undefined,
  };
}
