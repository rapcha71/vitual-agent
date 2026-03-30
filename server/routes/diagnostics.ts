import { Router } from "express";
import { requireAdmin } from "../middleware/admin";
import { diagnosticsService } from "../services/diagnostics-service";
import { logger } from "../lib/logger";

const router = Router();

// Endpoint 1: Test de Ingestión y Conectividad
router.post("/test-ingestion", requireAdmin, async (req, res) => {
  try {
    const userId = req.user!.id;
    const result = await diagnosticsService.runIngestionTest(userId);
    res.json(result);
  } catch (error: any) {
    logger.error("Error en Test de Ingestión:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Endpoint 2: Test de Duplicados (Haversine + Normalización de teléfono)
router.post("/test-duplicates", requireAdmin, async (req, res) => {
  try {
    const result = await diagnosticsService.runDuplicatesTest();
    res.json(result);
  } catch (error: any) {
    logger.error("Error en Test de Duplicados:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Endpoint 3: Test de Gestión Admin y CRM
router.post("/test-crm", requireAdmin, async (req, res) => {
  try {
    const result = await diagnosticsService.runCrmTest();
    res.json(result);
  } catch (error: any) {
    logger.error("Error en Test CRM:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

export default router;
