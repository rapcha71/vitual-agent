-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN 0006: Blindaje Geoespacial para Costa Rica
-- Virtual Agent — Auditoría Geoespacial de Emergencia
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. AUDITORÍA: Ver el tipo real del campo location en Supabase ────────────
-- (Ejecutar en Supabase SQL Editor para verificar el estado actual)
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'properties' AND column_name = 'location';
-- Resultado esperado: jsonb. Si dice 'text' o 'varchar', hay problema de tipo.

-- ─── 2. DETECCIÓN de coordenadas corruptas (fuera de Costa Rica) ─────────────
-- Costa Rica bounding box:
--   lat: 8.0° a 11.2° N
--   lng: -85.9° a -82.6° W
-- Santa Ana: lat ≈ 9.88–9.96, lng ≈ -84.18 a -84.11

-- Función para extraer lat/lng de JSONB con manejo de errores
CREATE OR REPLACE FUNCTION get_coord_lat(loc jsonb) RETURNS numeric AS $$
BEGIN
  RETURN CASE
    WHEN loc IS NULL THEN NULL
    WHEN loc->>'lat' IS NULL THEN NULL
    ELSE (loc->>'lat')::numeric
  END;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_coord_lng(loc jsonb) RETURNS numeric AS $$
BEGIN
  RETURN CASE
    WHEN loc IS NULL THEN NULL
    WHEN loc->>'lng' IS NULL THEN NULL
    ELSE (loc->>'lng')::numeric
  END;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ─── 3. CONSTRAINT: Bloquear inserción/actualización de coords fuera de CR ───
-- Solo se permite insertar propiedades con coordenadas dentro de Costa Rica.
-- Excepción: 0.0 / 0.0 → Punto por defecto de Daniel que aún no tiene GPS real.

ALTER TABLE properties DROP CONSTRAINT IF EXISTS chk_coords_within_costa_rica;

ALTER TABLE properties ADD CONSTRAINT chk_coords_within_costa_rica CHECK (
  -- Permitir coordenadas nulas (loc = null — aunque no debería pasar)
  location IS NULL
  OR
  -- Permitir el punto por defecto de Daniel (9.9281, -84.0907) o (0,0) durante upsert
  (
    get_coord_lat(location) IS NOT NULL
    AND get_coord_lng(location) IS NOT NULL
    AND (
      -- Punto 0,0 = lead de Daniel sin GPS todavía
      (get_coord_lat(location) = 0 AND get_coord_lng(location) = 0)
      OR
      -- Dentro del bounding box de Costa Rica
      (
        get_coord_lat(location) BETWEEN 8.0 AND 11.2
        AND get_coord_lng(location) BETWEEN -85.9 AND -82.6
      )
    )
  )
);

-- ─── 4. ÍNDICE para auditoría rápida de coordenadas corruptas ─────────────────
CREATE INDEX IF NOT EXISTS idx_properties_location_lat
  ON properties USING btree (get_coord_lat(location));

CREATE INDEX IF NOT EXISTS idx_properties_location_lng
  ON properties USING btree (get_coord_lng(location));

-- ─── 5. VIEW de auditoría: propiedades con coordenadas sospechosas ────────────
CREATE OR REPLACE VIEW v_geo_audit AS
SELECT
  id,
  property_id,
  sign_phone_number,
  province,
  district,
  daniel_source,
  get_coord_lat(location)  AS lat,
  get_coord_lng(location)  AS lng,
  location->>'address'     AS address,
  CASE
    WHEN get_coord_lat(location) IS NULL OR get_coord_lng(location) IS NULL
      THEN 'NULO'
    WHEN get_coord_lat(location) = 0 AND get_coord_lng(location) = 0
      THEN 'DANIEL_DEFAULT_SIN_GPS'
    WHEN get_coord_lat(location) NOT BETWEEN 8.0 AND 11.2
      OR  get_coord_lng(location) NOT BETWEEN -85.9 AND -82.6
      THEN 'FUERA_DE_COSTA_RICA'
    WHEN get_coord_lat(location) = get_coord_lng(location)
      THEN 'POSIBLE_INVERSION_LAT_LNG'
    ELSE 'OK'
  END AS coord_status,
  created_at
FROM properties
ORDER BY
  CASE
    WHEN get_coord_lat(location) IS NULL THEN 0
    WHEN get_coord_lat(location) NOT BETWEEN 8.0 AND 11.2 THEN 1
    ELSE 2
  END,
  created_at DESC;

-- ─── 6. COMENTARIO en la columna location para documentar el contrato ─────────
COMMENT ON COLUMN properties.location IS
  'JSONB con forma {lat: float, lng: float, address?: string}.
   lat debe estar entre 8.0 y 11.2 (Costa Rica).
   lng debe estar entre -85.9 y -82.6 (Costa Rica).
   El par (9.9281, -84.0907) es el punto por defecto de Daniel hasta que el dueño confirme GPS.
   NUNCA almacenar como texto ni invertir lat/lng.';
