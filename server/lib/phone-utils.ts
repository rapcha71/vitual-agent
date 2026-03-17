
/**
 * Normaliza un número de teléfono de Costa Rica.
 * Elimina espacios, guiones, puntos y el prefijo +506.
 * Retorna solo los 8 dígitos finales si es un número válido.
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // 1. Eliminar todo lo que no sea dígito
  let cleaned = phone.replace(/\D/g, '');
  
  // 2. Si empieza con 506 y tiene 11 dígitos, quitar el 506
  if (cleaned.length === 11 && cleaned.startsWith('506')) {
    cleaned = cleaned.substring(3);
  }
  
  // 3. Si tiene más de 8 dígitos pero no cumple lo anterior, tomar los últimos 8
  if (cleaned.length > 8) {
    cleaned = cleaned.slice(-8);
  }
  
  // 4. Validar que tenga exactamente 8 dígitos (formato CR)
  return cleaned.length === 8 ? cleaned : cleaned; // Retornamos lo que haya si no es 8, pero la lógica de negocio suele esperar 8.
}
