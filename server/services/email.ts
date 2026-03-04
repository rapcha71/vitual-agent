import nodemailer from "nodemailer";
import { logger } from "../lib/logger";

// Configuración SMTP (Gmail, SendGrid, etc.)
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

/**
 * Envía el código de recuperación de contraseña por correo.
 * Si SMTP no está configurado, solo loguea el código (solo en desarrollo).
 */
export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject: "Código de recuperación - Virtual Agent",
        text: `Tu código de recuperación es: ${code}\n\nVálido por 15 minutos.`,
        html: `
          <p>Tu código de recuperación es: <strong>${code}</strong></p>
          <p>Válido por 15 minutos.</p>
          <p>Si no solicitaste este código, ignora este correo.</p>
        `,
      });
      logger.debug("Password reset email sent");
      return true;
    } catch (err) {
      logger.error("Failed to send password reset email", err);
      return false;
    }
  }

  if (process.env.NODE_ENV === "development") {
    logger.debug("SMTP not configured - reset code:", code);
  }
  return false;
}
