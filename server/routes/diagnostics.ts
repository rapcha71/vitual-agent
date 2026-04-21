import { Router } from "express";
import { requireAdmin } from "../middleware/admin";
import { diagnosticsService } from "../services/diagnostics-service";
import { logger } from "../lib/logger";

const router = Router();

// ─── Test 1: Flujo de captura completo con datos técnicos ─────────────────────
router.post("/test-capture-flow", requireAdmin, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await diagnosticsService.runCaptureFlowTest(userId);
    res.json(result);
  } catch (error: any) {
    logger.error("Error en Test de Captura:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ─── Test 2: Subida de fotos + verificación de límite de peso ────────────────
router.post("/test-photo-upload", requireAdmin, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await diagnosticsService.runPhotoUploadTest(userId);
    res.json(result);
  } catch (error: any) {
    logger.error("Error en Test de Fotos:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ─── Test 3: Conexión real a la API de WASI ──────────────────────────────────
router.post("/test-wasi", requireAdmin, async (req, res) => {
  try {
    const result = await diagnosticsService.runWasiConnectionTest();
    res.json(result);
  } catch (error: any) {
    logger.error("Error en Test WASI:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ─── Limpieza manual de registros TEST_ ──────────────────────────────────────
router.post("/cleanup", requireAdmin, async (req, res) => {
  try {
    const result = await diagnosticsService.runCleanupOnly();
    res.json(result);
  } catch (error: any) {
    logger.error("Error en Cleanup:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ─── Rutas legacy (compatibilidad hacia atrás) ───────────────────────────────
router.post("/test-ingestion", requireAdmin, async (req, res) => {
  try {
    const result = await diagnosticsService.runCaptureFlowTest(req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/test-duplicates", requireAdmin, async (req, res) => {
  res.json({ logs: [{ status: 'WAIT', message: 'Test de duplicados movido al flujo de captura unificado.' }], durationMs: 0 });
});

router.post("/test-crm", requireAdmin, async (req, res) => {
  try {
    const result = await diagnosticsService.runWasiConnectionTest();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

export default router;
