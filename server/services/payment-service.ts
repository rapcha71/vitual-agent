
import { storage } from "../storage";
import { logger } from "../lib/logger";

export class PaymentService {
  private static PAYRATE = 250;

  /**
   * Procesa los pagos de los viernes.
   * Criterios:
   * 1. Solo propiedades con isPaid = false.
   * 2. Calcula monto total por usuario (count * 250).
   * 3. Crea registro en weekly_payments.
   * 4. Crea registros en earnings para cada propiedad.
   * 5. Marca propiedades como pagadas.
   */
  static async processWeeklyPayments() {
    logger.info("Iniciando proceso de pagos de los viernes...");
    
    try {
      const unpaidProperties = await storage.getUnpaidProperties();
      
      if (unpaidProperties.length === 0) {
        logger.info("No hay propiedades pendientes de pago.");
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
