
import { storage } from "../storage";
import { logger } from "../lib/logger";

export class PaymentService {
  private static PAYRATE = 250;

  /**
   * Calcula el inicio de la semana actual en Costa Rica (UTC-6).
   * Costa Rica no tiene horario de verano, siempre UTC-6.
   * La semana de pago va de Lunes 06:00 UTC (= Lunes 00:00 CR) a Domingo 05:59 UTC.
   */
  private static getCurrentWeekStart(): Date {
    const now = new Date();
    // Convertir a hora CR (UTC-6)
    const crOffsetMs = -6 * 60 * 60 * 1000;
    const crEquiv = new Date(now.getTime() + crOffsetMs);
    
    // Encontrar el lunes de esta semana en CR
    const dayOfWeekCR = crEquiv.getUTCDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
    const daysToMonday = dayOfWeekCR === 0 ? 6 : dayOfWeekCR - 1;
    
    // Lunes 00:00 CR = Lunes 06:00 UTC
    const weekStartUTC = new Date(Date.UTC(
      crEquiv.getUTCFullYear(),
      crEquiv.getUTCMonth(),
      crEquiv.getUTCDate() - daysToMonday,
      6, 0, 0, 0  // 06:00 UTC = 00:00 CR
    ));
    
    return weekStartUTC;
  }

  /**
   * Procesa los pagos de los viernes.
   * Criterios:
   * 1. Solo propiedades con isPaid = false.
   * 2. Solo propiedades creadas ANTES del inicio de la semana actual.
   *    → Las propiedades ingresadas esta semana se pagan el SIGUIENTE viernes.
   * 3. Calcula monto total por usuario (count * 250).
   * 4. Crea registro en weekly_payments.
   * 5. Crea registros en earnings para cada propiedad.
   * 6. Marca propiedades como pagadas.
   */
  static async processWeeklyPayments() {
    logger.info("Iniciando proceso de pagos de los viernes...");
    
    try {
      // Corte: solo propiedades de semanas anteriores (no la semana actual)
      const currentWeekStart = this.getCurrentWeekStart();
      logger.info(`Corte de pagos: propiedades creadas antes de ${currentWeekStart.toISOString()}`);
      
      const unpaidProperties = await storage.getUnpaidProperties(currentWeekStart);
      
      if (unpaidProperties.length === 0) {
        logger.info("No hay propiedades pendientes de pago de semanas anteriores.");
        return { processed: 0, totalAmount: 0 };
      }

      // Agrupar por usuario
      const userGroups = new Map<number, { user: any, properties: number[] }>();

      for (const prop of unpaidProperties) {
        if (!userGroups.has(prop.userId)) {
          userGroups.set(prop.userId, { user: prop.user, properties: [] });
        }
        userGroups.get(prop.userId)!.properties.push(prop.id);
      }

      let totalProcessed = 0;
      let grandTotalAmount = 0;

      for (const [userId, group] of Array.from(userGroups.entries())) {
        const propCount = group.properties.length;
        const totalAmount = propCount * this.PAYRATE;
        const weekOf = new Date().toISOString().split('T')[0];
        
        // Verificar si tiene SINPE
        const hasSinpe = !!group.user.paymentMobile;
        const status = hasSinpe ? "paid" : "pending_sinpe";

        logger.info(`Procesando pago para usuario ${group.user.username}: ${propCount} propiedades, Total: ₡${totalAmount}, Status: ${status}`);

        // 1. Crear el registro del pago semanal
        const weeklyPaymentId = await storage.createWeeklyPayment({
          userId,
          weekOf,
          totalAmount: totalAmount.toFixed(2),
          propertyCount: propCount,
          status
        });

        // 2. Marcar propiedades como pagadas y crear earnings (ya lo hace DatabaseStorage en transaccion)
        await storage.markPropertiesAsPaid(group.properties, weeklyPaymentId);

        totalProcessed += propCount;
        grandTotalAmount += totalAmount;
      }

      logger.info(`Proceso de pagos completado. Propiedades: ${totalProcessed}, Monto total: ₡${grandTotalAmount}`);
      return { processed: totalProcessed, totalAmount: grandTotalAmount };

    } catch (error) {
      logger.error("Error crítico en el proceso de pagos:", error);
      throw error;
    }
  }
}
