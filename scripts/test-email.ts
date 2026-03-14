import "dotenv/config";
import nodemailer from "nodemailer";

async function testEmail() {
  console.log("Testing SMTP connection with Porkbun...");
  
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  console.log({ host, port, user: user, passLength: pass?.length });

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // false for 587
    auth: { user, pass },
    logger: true, // Enable nodemailer logs
    debug: true, // Include SMTP traffic in the logs
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to: "rapcha@gmail.com", // Temporary test address just to see if it sends
      subject: "Test de Conexión Virtual Agent",
      text: "Si recibes esto, el servidor SMTP de Porkbun está configurado correctamente.",
    });
    console.log("✅ Correo enviado exitosamente!");
    console.log("Detalles:", info.messageId);
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
  }
}

testEmail();
