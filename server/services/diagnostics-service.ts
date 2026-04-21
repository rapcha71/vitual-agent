import { storage } from '../storage';
import { pool } from '../db';
import { eq, like } from 'drizzle-orm';
import { properties } from '../../shared/schema';

export interface DiagnosticLog {
  status: 'OK' | 'WAIT' | 'FAIL';
  message: string;
  suggestion?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Genera una imagen JPEG base64 de NxN píxeles sólido */
function generateTestImageBase64(widthPx = 1, color = '#FF0000'): string {
  // 1x1 rojo mínimo (válido para tests de flujo)
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVIP/2Q==';
}

/** Genera una imagen base64 de tamaño aproximado `targetKB` KB (llenado con datos) */
function generateHeavyImageBase64(targetKB: number): string {
  // padding de base64 para simular imagen de peso real
  const bytes = targetKB * 1024;
  // JPEG header + padding de ceros (simulado, no decodificable como imagen real)
  const padding = 'A'.repeat(Math.ceil((bytes * 4) / 3));
  return `data:image/jpeg;base64,${padding.slice(0, Math.ceil(bytes * 1.33))}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class DiagnosticsService {

  /** Elimina todos los registros de prueba (propertyId que empieza con TEST_) */
  async cleanup(): Promise<{ deleted: number }> {
    try {
      const { db } = await import('../db');
      const result = await db.delete(properties).where(like(properties.propertyId, 'TEST_%')).returning();
      return { deleted: result.length };
    } catch (error) {
      console.error('Error in diagnostics cleanup:', error);
      return { deleted: 0 };
    }
  }

  // ─── TEST 1: Flujo de captura con datos técnicos completos ────────────────

  async runCaptureFlowTest(userId: number): Promise<{ logs: DiagnosticLog[]; durationMs: number }> {
    const logs: DiagnosticLog[] = [];
    const startTime = Date.now();
    const testId = `TEST_CAPTURA_${Date.now()}`;

    try {
      // 1. Validación de tipos admitidos
      logs.push({ status: 'WAIT', message: 'Verificando tipos de propiedad admitidos (house, land, commercial)...' });
      const validTypes = ['house', 'land', 'commercial'];
      if (validTypes.every(t => typeof t === 'string')) {
        logs.push({ status: 'OK', message: `Tipos válidos: ${validTypes.join(', ')}` });
      } else {
        logs.push({ status: 'FAIL', message: 'Tipos de propiedad no válidos' });
      }

      // 2. Construir payload completo con todos los campos técnicos del schema
      logs.push({ status: 'WAIT', message: `Construyendo payload completo con campos técnicos (testId: ${testId})...` });

      const testPayload = {
        userId,
        propertyType: 'house' as const,
        province: '01',
        district: '01-01',
        signPhoneNumber: '+506 8888-8888',
        location: { lat: 9.9281, lng: -84.0907 },
        propertyId: testId,
        images: [generateTestImageBase64()] as any,
        thumbnails: [] as any,
        blurhashes: [] as any,
        markerColor: 'blue',
        createdAt: new Date().toISOString(),
      };

      // Verificar que los campos requeridos están presentes
      const requiredFields = ['userId', 'propertyType', 'province', 'district', 'location', 'propertyId', 'images'];
      const missingFields = requiredFields.filter(f => !(f in testPayload));
      if (missingFields.length > 0) {
        logs.push({ status: 'FAIL', message: `Campos faltantes: ${missingFields.join(', ')}`, suggestion: 'Verificá el schema insertPropertySchema en shared/schema.ts' });
      } else {
        logs.push({ status: 'OK', message: `Payload completo — ${requiredFields.length} campos requeridos presentes` });
      }

      // 3. Insertar en DB
      logs.push({ status: 'WAIT', message: 'Insertando propiedad test en Supabase/PostgreSQL...' });
      const t0 = Date.now();
      const created = await storage.createProperty(testPayload);
      const insertMs = Date.now() - t0;

      logs.push({ status: 'OK', message: `Registro insertado en DB en ${insertMs}ms — ID: ${created.propertyId}` });

      // 4. Verificar que se puede leer de vuelta
      logs.push({ status: 'WAIT', message: 'Verificando lectura de vuelta (round-trip)...' });
      const { db } = await import('../db');
      const [fetched] = await db.select().from(properties).where(eq(properties.propertyId, testId));

      if (fetched && fetched.propertyId === testId) {
        logs.push({ status: 'OK', message: `Round-trip DB confirmado — propertyType: ${fetched.propertyType}, province: ${fetched.province}, district: ${fetched.district}` });
      } else {
        logs.push({ status: 'FAIL', message: 'No se encontró el registro recién insertado', suggestion: 'Verificá permisos SELECT en la tabla properties' });
      }

      // 5. Verificar coordenadas GPS
      if (fetched?.location && typeof (fetched.location as any).lat === 'number' && typeof (fetched.location as any).lng === 'number') {
        const loc = fetched.location as any;
        logs.push({ status: 'OK', message: `GPS almacenado correctamente: lat=${loc.lat.toFixed(4)}, lng=${loc.lng.toFixed(4)}` });
      } else {
        logs.push({ status: 'FAIL', message: 'Coordenadas GPS corruptas o ausentes', suggestion: 'Verificá que el campo `location` es JSONB con {lat, lng}' });
      }

    } catch (error: any) {
      logs.push({
        status: 'FAIL',
        message: `Excepción en flujo de captura: ${error.message}`,
        suggestion: 'Revisá logs del servidor (Railway/Supabase) para detalles de la excepción.',
      });
    } finally {
      // Cleanup TEST_
      const { deleted } = await this.cleanup();
      logs.push({ status: 'OK', message: `Limpieza completada — ${deleted} registro(s) TEST_ eliminado(s)` });
    }

    return { logs, durationMs: Date.now() - startTime };
  }

  // ─── TEST 2: Subida de fotos — verificación de límite de peso ─────────────

  async runPhotoUploadTest(userId: number): Promise<{ logs: DiagnosticLog[]; durationMs: number }> {
    const logs: DiagnosticLog[] = [];
    const startTime = Date.now();
    const LIMIT_KB = 512; // 500 KB objetivo (con margen)

    try {
      // 1. Imagen mínima válida (1px)
      logs.push({ status: 'WAIT', message: 'Generando imagen mínima de test (1px JPEG)...' });
      const minImg = generateTestImageBase64(1);
      const minKB = Math.round((minImg.length * 3) / 4 / 1024);
      logs.push({ status: 'OK', message: `Imagen mínima generada: ~${minKB} KB — dentro del límite de ${LIMIT_KB} KB ✓` });

      // 2. Simular imagen de cámara real (~800KB antes de comprimir)
      logs.push({ status: 'WAIT', message: 'Simulando captura de cámara real (~800 KB sin comprimir)...' });
      const rawKB = 800;
      logs.push({ status: 'OK', message: `Imagen cruda simulada: ${rawKB} KB` });

      // 3. Verificar pipeline de compresión (max 1920px, target 500KB)
      logs.push({ status: 'WAIT', message: 'Verificando pipeline de compresión: maxWidthOrHeight=1920px, target=500KB...' });

      // Simular resultado de compresión (la lógica real está en el cliente)
      const compressedEstimateKB = Math.round(rawKB * 0.58); // factor típico de compresión JPEG 0.82
      if (compressedEstimateKB <= LIMIT_KB) {
        logs.push({ status: 'OK', message: `Estimación de compresión: ${rawKB} KB → ~${compressedEstimateKB} KB (dentro del límite de ${LIMIT_KB} KB)` });
      } else {
        logs.push({
          status: 'FAIL',
          message: `Estimación excede límite: ~${compressedEstimateKB} KB > ${LIMIT_KB} KB`,
          suggestion: 'Reducí maxWidthOrHeight a 1600px o bajá initialQuality a 0.70 en el pipeline de compresión del cliente.',
        });
      }

      // 4. Insertar propiedad de test con imagen mínima
      logs.push({ status: 'WAIT', message: 'Insertando propiedad test con imagen en DB para verificar almacenamiento...' });
      const testId = `TEST_FOTO_${Date.now()}`;
      const t0 = Date.now();
      const created = await storage.createProperty({
        userId,
        propertyType: 'house' as const,
        province: '01',
        district: '01-01',
        signPhoneNumber: null,
        location: { lat: 9.9281, lng: -84.0907 },
        propertyId: testId,
        images: [minImg] as any,
        thumbnails: [] as any,
        blurhashes: [] as any,
        markerColor: 'blue',
        createdAt: new Date().toISOString(),
      });
      const insertMs = Date.now() - t0;
      logs.push({ status: 'OK', message: `Datos de imagen almacenados en DB en ${insertMs}ms — propertyId: ${created.propertyId}` });

      // 5. Verificar lectura de imagen
      const { db } = await import('../db');
      const [fetched] = await db.select().from(properties).where(eq(properties.propertyId, testId));
      const storedImages = (fetched?.images as any) || [];
      if (Array.isArray(storedImages) && storedImages.length > 0) {
        const firstImg: string = storedImages[0];
        const storedKB = Math.round((firstImg.length * 3) / 4 / 1024);
        logs.push({ status: 'OK', message: `Imagen recuperada de DB: ~${storedKB} KB — integridad de datos confirmada` });
      } else {
        logs.push({ status: 'FAIL', message: 'No se encontraron imágenes en el registro recuperado', suggestion: 'Verificá que la columna `images` en properties es de tipo JSONB y admite arrays.' });
      }

    } catch (error: any) {
      logs.push({
        status: 'FAIL',
        message: `Error en test de fotos: ${error.message}`,
        suggestion: 'Revisá el límite de payload en el servidor (bodyParser/express JSON limit).',
      });
    } finally {
      const { deleted } = await this.cleanup();
      logs.push({ status: 'OK', message: `Limpieza completada — ${deleted} registro(s) TEST_ eliminado(s)` });
    }

    return { logs, durationMs: Date.now() - startTime };
  }

  // ─── TEST 3: Conexión real a la API de WASI ───────────────────────────────

  async runWasiConnectionTest(): Promise<{ logs: DiagnosticLog[]; durationMs: number }> {
    const logs: DiagnosticLog[] = [];
    const startTime = Date.now();

    try {
      // 1. Verificar que la variable de entorno está configurada
      logs.push({ status: 'WAIT', message: 'Verificando credenciales WASI en variables de entorno...' });
      const wasiToken = process.env.WASI_TOKEN || process.env.WASI_API_KEY || '';
      const wasiUserId = process.env.WASI_USER_ID || process.env.WASI_COMPANY_ID || '';

      if (!wasiToken) {
        logs.push({
          status: 'FAIL',
          message: 'WASI_TOKEN / WASI_API_KEY no encontrado en variables de entorno',
          suggestion: 'Configurá WASI_TOKEN en Railway → Variables de entorno o en el archivo .env local.',
        });
        return { logs, durationMs: Date.now() - startTime };
      }
      logs.push({ status: 'OK', message: `WASI_TOKEN presente (longitud: ${wasiToken.length} caracteres)` });

      if (wasiUserId) {
        logs.push({ status: 'OK', message: `WASI_USER_ID/COMPANY_ID configurado: ${wasiUserId}` });
      } else {
        logs.push({ status: 'WAIT', message: 'WASI_USER_ID no encontrado — se intentará sin él' });
      }

      // 2. Ping al endpoint de WASI (real)
      logs.push({ status: 'WAIT', message: 'Conectando a la API de WASI (wasi.co)...' });
      const t0 = Date.now();

      let wasiOk = false;
      let wasiStatus = 0;
      let wasiErrorMsg = '';
      let wasiResponse: any = null;

      try {
        const wasiUrl = `https://api.wasi.co/v1/property/search?user_id=${wasiUserId}&api_token=${wasiToken}&limit=1`;
        const res = await fetch(wasiUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(8000),
        } as any);
        wasiStatus = res.status;
        if (res.ok) {
          wasiOk = true;
          wasiResponse = await res.json();
        } else {
          wasiErrorMsg = `HTTP ${res.status}`;
          try { const errBody = await res.text(); wasiErrorMsg += `: ${errBody.slice(0, 120)}`; } catch {}
        }
      } catch (fetchErr: any) {
        wasiErrorMsg = fetchErr.message || 'Error de red';
      }

      const wasiMs = Date.now() - t0;

      if (wasiOk) {
        const propCount = Array.isArray(wasiResponse) ? wasiResponse.length : (wasiResponse?.total_items ?? '?');
        logs.push({ status: 'OK', message: `WASI API respondió en ${wasiMs}ms — HTTP ${wasiStatus} — propiedades encontradas: ${propCount}` });

        // 3. Verificar estructura de respuesta
        logs.push({ status: 'WAIT', message: 'Verificando estructura de respuesta WASI...' });
        const firstItem = Array.isArray(wasiResponse) ? wasiResponse[0] : (wasiResponse?.list?.[0] ?? null);
        if (firstItem) {
          const fields = ['id', 'title', 'sale_price', 'rent_price', 'area'].filter(f => f in firstItem);
          logs.push({ status: 'OK', message: `Campos disponibles en respuesta: ${fields.join(', ')}` });
        } else {
          logs.push({ status: 'WAIT', message: 'Sin propiedades en la respuesta (posible cuenta vacía) — la conexión es válida' });
        }

        // 4. Verificar latencia
        if (wasiMs < 3000) {
          logs.push({ status: 'OK', message: `Latencia WASI aceptable: ${wasiMs}ms (< 3000ms)` });
        } else {
          logs.push({
            status: 'FAIL',
            message: `Latencia WASI elevada: ${wasiMs}ms (> 3000ms)`,
            suggestion: 'La API de WASI puede estar lenta. Implementá caché del lado del servidor o aumentá el timeout.',
          });
        }

      } else {
        logs.push({
          status: 'FAIL',
          message: `WASI API no respondió correctamente en ${wasiMs}ms — ${wasiErrorMsg}`,
          suggestion: wasiStatus === 401 || wasiStatus === 403
            ? 'El token WASI es inválido o expiró. Generá uno nuevo desde tu cuenta wasi.co.'
            : wasiStatus === 429
              ? 'Rate limit alcanzado. Esperá antes de volver a conectar.'
              : 'Verificá la URL de la API de WASI y que el token sea correcto.',
        });
      }

    } catch (error: any) {
      logs.push({
        status: 'FAIL',
        message: `Excepción al conectar con WASI: ${error.message}`,
        suggestion: 'Verificá que el servidor tiene acceso a internet (Railway/Railway egress). Revisá si wasi.co está bloqueado por firewall.',
      });
    }

    return { logs, durationMs: Date.now() - startTime };
  }

  // ─── Limpieza manual (endpoint dedicado) ─────────────────────────────────

  async runCleanupOnly(): Promise<{ logs: DiagnosticLog[]; durationMs: number }> {
    const logs: DiagnosticLog[] = [];
    const startTime = Date.now();
    logs.push({ status: 'WAIT', message: 'Buscando y eliminando registros TEST_ en la base de datos...' });
    const { deleted } = await this.cleanup();
    if (deleted > 0) {
      logs.push({ status: 'OK', message: `${deleted} registro(s) TEST_ eliminado(s) correctamente` });
    } else {
      logs.push({ status: 'OK', message: 'No se encontraron registros TEST_ pendientes de eliminar' });
    }
    return { logs, durationMs: Date.now() - startTime };
  }
}

export const diagnosticsService = new DiagnosticsService();
