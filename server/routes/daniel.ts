/**
 * API Routes para el Bot "Daniel Pérez" (Make.com → Supabase)
 *
 * Protección: todas las rutas requieren el header:
 *   X-Daniel-Secret: <DANIEL_SECRET_KEY>
 *
 * Variables de entorno requeridas:
 *   DANIEL_SECRET_KEY    — clave secreta compartida con Make.com
 *   DANIEL_BOT_USER_ID   — ID del usuario en DB asignado al bot (ej: 1)
 */

import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../db";
import { logger } from "../lib/logger";

const router = Router();

// ─── Autenticación por API key ────────────────────────────────────────────────

function requireDanielKey(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.DANIEL_SECRET_KEY;
  if (!secret) {
    // Si no está configurada la clave, rechazar siempre
    return res.status(503).json({ error: "Daniel API no configurada. Falta DANIEL_SECRET_KEY." });
  }
  const provided = req.headers["x-daniel-secret"] || req.body?.danielSecret;
  if (provided !== secret) {
    return res.status(401).json({ error: "Clave secreta inválida" });
  }
  next();
}

router.use(requireDanielKey);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Genera un propertyId con prefijo DB_ para leads de Daniel */
async function generateDanielPropertyId(): Promise<string> {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 999).toString().padStart(3, "0");
  return `DB${ts}${rand}`;
}

/** Obtiene el userId del bot desde la variable de entorno */
function getBotUserId(): number {
  const id = parseInt(process.env.DANIEL_BOT_USER_ID || "1");
  return isNaN(id) ? 1 : id;
}

// ─── POST /api/daniel/upsert-lead ─────────────────────────────────────────────
/**
 * Make.com llama aquí al INICIAR una conversación.
 * Crea o recupera el registro de propiedad asociado al número de WhatsApp.
 *
 * Body JSON:
 * {
 *   phone: "+50688888888",   // número del dueño (E.164)
 *   propertyType?: "house" | "land" | "commercial"  // si ya se sabe
 * }
 *
 * Response: { propertyId, isNew }
 */
router.post("/upsert-lead", async (req: Request, res: Response) => {
  try {
    const { phone, propertyType } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "phone es requerido" });
    }

    // Buscar propiedad existente con ese teléfono Y que venga de Daniel
    const existing = await pool.query(
      `SELECT property_id, id FROM properties
       WHERE sign_phone_number = $1 AND daniel_source = true
       ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );

    if (existing.rows.length > 0) {
      return res.json({
        propertyId: existing.rows[0].property_id,
        isNew: false,
      });
    }

    // Crear nuevo registro de lead
    const propertyId = await generateDanielPropertyId();
    const botUserId = getBotUserId();
    const type = propertyType || "house";
    const markerColor = type === "land" ? "green" : type === "commercial" ? "yellow" : "blue";

    await pool.query(
      `INSERT INTO properties
        (user_id, property_type, sign_phone_number, location, property_id,
         images, thumbnails, blurhashes, marker_color, created_at,
         viewed_by_admin, is_paid, tiene_contrato, daniel_source)
       VALUES
        ($1, $2, $3, $4, $5,
         '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, $6, $7,
         false, false, false, true)`,
      [
        botUserId,
        type,
        phone,
        JSON.stringify({ lat: 9.9281, lng: -84.0907 }), // centro CR por defecto
        propertyId,
        markerColor,
        new Date().toISOString(),
      ]
    );

    logger.info(`[Daniel] Nuevo lead creado: ${propertyId} para ${phone}`);

    return res.status(201).json({ propertyId, isNew: true });
  } catch (error: any) {
    logger.error("[Daniel] Error en upsert-lead:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/daniel/update-fields ───────────────────────────────────────────
/**
 * Make.com llama aquí cada vez que Gemini extrae uno o más campos.
 * Actualiza las columnas correspondientes en la propiedad.
 *
 * Body JSON:
 * {
 *   propertyId: "DB123456789",
 *   fields: {
 *     precio?: number,
 *     areaM2?: number,
 *     anioConst?: number,
 *     habitaciones?: number,
 *     banos?: number,
 *     cocheras?: number,
 *     numPisos?: number,
 *     propertyType?: "house"|"land"|"commercial"
 *   }
 * }
 */
router.post("/update-fields", async (req: Request, res: Response) => {
  try {
    const { propertyId, fields } = req.body;

    if (!propertyId || !fields || typeof fields !== "object") {
      return res.status(400).json({ error: "propertyId y fields son requeridos" });
    }

    // Whitelist de columnas permitidas para evitar SQL injection
    const ALLOWED: Record<string, string> = {
      precio:       "precio",
      areaM2:       "area_m2",
      anioConst:    "anio_const",
      habitaciones: "habitaciones",
      banos:        "banos",
      cocheras:     "cocheras",
      numPisos:     "num_pisos",
      propertyType: "property_type",
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, pgCol] of Object.entries(ALLOWED)) {
      if (fields[key] !== undefined && fields[key] !== null) {
        setClauses.push(`"${pgCol}" = $${idx}`);
        values.push(fields[key]);
        idx++;
      }
    }

    if (setClauses.length === 0) {
      return res.json({ updated: 0, message: "No hay campos válidos para actualizar" });
    }

    values.push(propertyId);
    const sql = `UPDATE properties SET ${setClauses.join(", ")} WHERE property_id = $${idx}`;
    const result = await pool.query(sql, values);

    logger.info(`[Daniel] Campos actualizados en ${propertyId}: ${Object.keys(fields).join(", ")}`);

    return res.json({ updated: result.rowCount, fields: Object.keys(fields) });
  } catch (error: any) {
    logger.error("[Daniel] Error en update-fields:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/daniel/add-photo ───────────────────────────────────────────────
/**
 * Make.com llama aquí cuando el dueño envía una foto por WhatsApp.
 * Las fotos se guardan como URLs de Supabase Storage (alta resolución original).
 *
 * Body JSON:
 * {
 *   propertyId: "DB123456789",
 *   photoUrl: "https://..."   // URL pública de Supabase Storage / Evolution API media
 * }
 */
router.post("/add-photo", async (req: Request, res: Response) => {
  try {
    const { propertyId, photoUrl } = req.body;

    if (!propertyId || !photoUrl) {
      return res.status(400).json({ error: "propertyId y photoUrl son requeridos" });
    }

    // Append la URL al array images (alta resolución, sin comprimir)
    const result = await pool.query(
      `UPDATE properties
       SET images = images || to_jsonb($1::text)
       WHERE property_id = $2
       RETURNING json_array_length(images) AS photo_count`,
      [photoUrl, propertyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Propiedad no encontrada" });
    }

    const photoCount = result.rows[0]?.photo_count || 0;
    logger.info(`[Daniel] Foto agregada a ${propertyId} (total: ${photoCount})`);

    return res.json({ success: true, photoCount });
  } catch (error: any) {
    logger.error("[Daniel] Error en add-photo:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/daniel/complete ────────────────────────────────────────────────
/**
 * Make.com llama aquí cuando Daniel termina la conversación.
 * Marca la propiedad como revisada y envía notificación interna al admin.
 *
 * Body JSON:
 * {
 *   propertyId: "DB123456789",
 *   phone: "+50688888888",
 *   summary: "Objeto JSON con resumen de lo recolectado"
 * }
 */
router.post("/complete", async (req: Request, res: Response) => {
  try {
    const { propertyId, phone, summary } = req.body;

    if (!propertyId) {
      return res.status(400).json({ error: "propertyId es requerido" });
    }

    // Marcar como vista pendiente (admin verá la notificación)
    await pool.query(
      `UPDATE properties SET viewed_by_admin = false WHERE property_id = $1`,
      [propertyId]
    );

    // Crear mensaje interno de notificación para el admin
    try {
      const superAdminResult = await pool.query(
        `SELECT id FROM users WHERE is_super_admin = true ORDER BY id LIMIT 1`
      );
      const superAdminId = superAdminResult.rows[0]?.id;

      const botUserId = getBotUserId();

      if (superAdminId) {
        const notifMsg = `🤖 *Daniel Pérez* terminó de recolectar información de la propiedad.\n\n📱 Teléfono del dueño: ${phone || "desconocido"}\n🏠 ID Propiedad: ${propertyId}\n\n✅ Revisar en el Panel de Propiedades → Filtrar por "Bot Daniel".`;
        await pool.query(
          `INSERT INTO messages (sender_id, recipient_id, content, created_at, unread_by_users)
           VALUES ($1, $2, $3, $4, ARRAY[$2])`,
          [botUserId, superAdminId, notifMsg, new Date().toISOString()]
        );
      }
    } catch (notifErr) {
      // La notificación no es crítica — no fallar por esto
      logger.warn("[Daniel] No se pudo enviar notificación al admin:", notifErr);
    }

    logger.info(`[Daniel] Conversación completada para ${propertyId} (${phone})`);

    return res.json({
      success: true,
      propertyId,
      message: "Conversación marcada como completada. Admin notificado.",
    });
  } catch (error: any) {
    logger.error("[Daniel] Error en complete:", error);
    return res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/daniel/status/:propertyId ──────────────────────────────────────
/**
 * Make.com puede consultar el estado actual de una propiedad.
 * Útil para que el data store de Make.com sepa qué campos ya tiene.
 */
router.get("/status/:propertyId", async (req: Request, res: Response) => {
  try {
    const { propertyId } = req.params;

    const result = await pool.query(
      `SELECT property_id, property_type, sign_phone_number,
              precio, area_m2, anio_const, habitaciones, banos,
              cocheras, num_pisos, created_at,
              json_array_length(images) AS photo_count
       FROM properties WHERE property_id = $1`,
      [propertyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Propiedad no encontrada" });
    }

    const row = result.rows[0];
    return res.json({
      propertyId: row.property_id,
      propertyType: row.property_type,
      phone: row.sign_phone_number,
      collected: {
        precio:       row.precio,
        areaM2:       row.area_m2,
        anioConst:    row.anio_const,
        habitaciones: row.habitaciones,
        banos:        row.banos,
        cocheras:     row.cocheras,
        numPisos:     row.num_pisos,
        photoCount:   row.photo_count || 0,
      },
      missingFields: [
        !row.precio       && "precio",
        !row.habitaciones && "habitaciones",
        !row.banos        && "banos",
        !row.cocheras     && "cocheras",
        !row.num_pisos    && "numPisos",
        !row.anio_const   && "anioConst",
        (row.photo_count || 0) === 0 && "fotos",
      ].filter(Boolean),
    });
  } catch (error: any) {
    logger.error("[Daniel] Error en status:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
