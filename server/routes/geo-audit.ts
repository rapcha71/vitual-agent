/**
 * API de Auditoría Geoespacial — Virtual Agent
 * GET /api/admin/geo-audit      → Reporta propiedades con coords sospechosas
 * POST /api/admin/geo-audit/fix → Corrige registros con {lat:0,lng:0} marcados por Daniel
 */

import { Router, Request, Response } from "express";
import { pool } from "../db";
import { requireAdmin } from "../middleware/admin";
import { logger } from "../lib/logger";

const router = Router();
router.use(requireAdmin);

// ─── Límites geográficos de Costa Rica ───────────────────────────────────────
const CR_BOUNDS = {
  lat: { min: 8.0, max: 11.2 },
  lng: { min: -85.9, max: -82.6 },
};

// Coordenadas de Santa Ana, San José (centroide)
const SANTA_ANA_CENTROID = { lat: 9.9281, lng: -84.1856 };

// ─── GET /api/admin/geo-audit ─────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        property_id,
        sign_phone_number,
        province,
        district,
        daniel_source,
        (location->>'lat')::numeric  AS lat,
        (location->>'lng')::numeric  AS lng,
        location->>'address'         AS address,
        created_at,
        CASE
          WHEN (location->>'lat') IS NULL OR (location->>'lng') IS NULL
            THEN 'NULO'
          WHEN (location->>'lat')::numeric = 0 AND (location->>'lng')::numeric = 0
            THEN 'DANIEL_DEFAULT_SIN_GPS'
          WHEN (location->>'lat')::numeric NOT BETWEEN 8.0 AND 11.2
            OR  (location->>'lng')::numeric NOT BETWEEN -85.9 AND -82.6
            THEN 'FUERA_DE_COSTA_RICA'
          WHEN ABS((location->>'lat')::numeric - (location->>'lng')::numeric) < 0.001
            THEN 'POSIBLE_INVERSION_LAT_LNG'
          ELSE 'OK'
        END AS coord_status
      FROM properties
      ORDER BY
        CASE
          WHEN (location->>'lat') IS NULL THEN 0
          WHEN (location->>'lat')::numeric NOT BETWEEN 8.0 AND 11.2 THEN 1
          WHEN (location->>'lat')::numeric = 0 THEN 2
          ELSE 3
        END,
        created_at DESC
    `);

    const rows = result.rows;
    const summary = {
      total: rows.length,
      ok: rows.filter((r) => r.coord_status === "OK").length,
      fuera_cr: rows.filter((r) => r.coord_status === "FUERA_DE_COSTA_RICA").length,
      sin_gps: rows.filter((r) => r.coord_status === "DANIEL_DEFAULT_SIN_GPS").length,
      nulos: rows.filter((r) => r.coord_status === "NULO").length,
      posible_inversion: rows.filter((r) => r.coord_status === "POSIBLE_INVERSION_LAT_LNG").length,
      cr_bounds: CR_BOUNDS,
    };

    // Detectar propiedades fuera de CR con mayor detalle
    const critical = rows.filter((r) =>
      r.coord_status === "FUERA_DE_COSTA_RICA" || r.coord_status === "NULO"
    ).map((r) => ({
      propertyId: r.property_id,
      phone: r.sign_phone_number,
      province: r.province,
      district: r.district,
      lat: Number(r.lat),
      lng: Number(r.lng),
      address: r.address,
      status: r.coord_status,
      danielSource: r.daniel_source,
      createdAt: r.created_at,
      diagnosis: diagnoseProblem(Number(r.lat), Number(r.lng), r.address),
    }));

    logger.info(`[GeoAudit] Auditoría ejecutada: ${summary.ok} OK, ${summary.fuera_cr} FUERA_CR, ${summary.sin_gps} SIN_GPS`);

    return res.json({
      summary,
      critical,
      allProperties: rows.map((r) => ({
        propertyId: r.property_id,
        lat: Number(r.lat),
        lng: Number(r.lng),
        status: r.coord_status,
        danielSource: r.daniel_source,
        province: r.province,
      })),
    });
  } catch (error: any) {
    logger.error("[GeoAudit] Error en auditoría:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/admin/geo-audit/santa-ana ───────────────────────────────────────
// Verifica propiedades de Santa Ana (distrito 01-08) vs sus coordenadas
router.get("/santa-ana", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        property_id,
        sign_phone_number,
        province,
        district,
        (location->>'lat')::numeric  AS lat,
        (location->>'lng')::numeric  AS lng,
        location->>'address'         AS address,
        created_at,
        daniel_source
      FROM properties
      WHERE district ILIKE '%santa ana%' OR district ILIKE '%01-08%' OR district = '01-08'
      ORDER BY created_at DESC
    `);

    // Santa Ana bounding box (canton, San José)
    // aprox: lat 9.86–9.97, lng -84.22 a -84.08
    const SANTA_ANA_BOX = {
      lat: { min: 9.86, max: 9.97 },
      lng: { min: -84.22, max: -84.08 },
    };

    const withAnalysis = result.rows.map((r) => {
      const lat = Number(r.lat);
      const lng = Number(r.lng);
      const inSantaAna =
        lat >= SANTA_ANA_BOX.lat.min &&
        lat <= SANTA_ANA_BOX.lat.max &&
        lng >= SANTA_ANA_BOX.lng.min &&
        lng <= SANTA_ANA_BOX.lng.max;
      return {
        propertyId: r.property_id,
        phone: r.sign_phone_number,
        lat,
        lng,
        address: r.address,
        inSantaAna,
        status: inSantaAna ? "OK" : (lat === 0 && lng === 0 ? "DANIEL_DEFAULT_SIN_GPS" : "DESPLAZADA"),
        diagnosis: !inSantaAna ? diagnoseProblem(lat, lng, r.address) : null,
        createdAt: r.created_at,
        danielSource: r.daniel_source,
      };
    });

    return res.json({
      santaAnaBox: SANTA_ANA_BOX,
      total: withAnalysis.length,
      ok: withAnalysis.filter((p) => p.status === "OK").length,
      desplazadas: withAnalysis.filter((p) => p.status === "DESPLAZADA"),
      sinGps: withAnalysis.filter((p) => p.status === "DANIEL_DEFAULT_SIN_GPS"),
      properties: withAnalysis,
    });
  } catch (error: any) {
    logger.error("[GeoAudit/SantaAna] Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/admin/geo-audit/schema ─────────────────────────────────────────
// Verifica el tipo de dato de la columna location en la base de datos
router.get("/schema", async (_req: Request, res: Response) => {
  try {
    const colTypeResult = await pool.query(`
      SELECT column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'properties'
        AND column_name IN ('location')
        AND table_schema = 'public'
    `);

    const sampleResult = await pool.query(`
      SELECT
        property_id,
        pg_typeof(location) AS pg_type,
        location,
        octet_length(location::text) AS size_bytes
      FROM properties
      LIMIT 5
    `);

    const constraintResult = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'properties'::regclass
        AND contype = 'c'
    `);

    return res.json({
      columnType: colTypeResult.rows,
      samples: sampleResult.rows.map((r) => ({
        propertyId: r.property_id,
        pgType: r.pg_type,
        location: r.location,
        sizeBytes: r.size_bytes,
        latType: r.location ? typeof r.location.lat : null,
        lngType: r.location ? typeof r.location.lng : null,
        latValue: r.location ? r.location.lat : null,
        lngValue: r.location ? r.location.lng : null,
      })),
      constraints: constraintResult.rows,
      analysis: {
        isJsonb: colTypeResult.rows[0]?.data_type === "jsonb",
        recommendation:
          colTypeResult.rows[0]?.data_type === "jsonb"
            ? "✅ Tipo correcto (JSONB). La precisión decimal está preservada."
            : "❌ PROBLEMA: El campo no es JSONB. Las coordenadas pueden estar perdiendo precisión.",
      },
    });
  } catch (error: any) {
    logger.error("[GeoAudit/Schema] Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─── Diagnóstico de causa raíz ────────────────────────────────────────────────
function diagnoseProblem(lat: number, lng: number, address?: string | null): string {
  if (lat === 0 && lng === 0) {
    return "Lead de Daniel: sin GPS real confirmado aún. El dueño debe confirmar ubicación vía WhatsApp.";
  }
  if (lat > 11.2 || lat < 8.0) {
    if (Math.abs(lat) > 82 && Math.abs(lat) < 86) {
      return "⚠️ INVERSIÓN DETECTADA: lat contiene un valor de longitud. Verificar orden [lat, lng] en el código.";
    }
    return `⚠️ Latitud ${lat} fuera del rango de Costa Rica (8.0–11.2). Posible truncamiento decimal o error de entry.`;
  }
  if (lng > -82.6 || lng < -85.9) {
    if (Math.abs(lng) < 12) {
      return "⚠️ INVERSIÓN DETECTADA: lng contiene un valor de latitud. Verificar orden [lat, lng] en el código.";
    }
    return `⚠️ Longitud ${lng} fuera del rango de Costa Rica (-85.9 a -82.6). Posible error de sign (positivo/negativo) o truncamiento.`;
  }
  return "Revisar manualmente: coordenada dentro de CR pero puede no coincidir con el cantón indicado.";
}

export default router;
