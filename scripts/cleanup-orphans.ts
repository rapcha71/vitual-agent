import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Iniciando limpieza de registros de usuarios 'eliminados' (soft-deleted)...");

  const allUsers = await db.select().from(users);
  
  // Buscar usuarios que están marcados como eliminados
  const softDeletedUsers = allUsers.filter(u => u.isDeleted === true);
  
  if (softDeletedUsers.length === 0) {
    console.log("No se encontraron usuarios marcados como eliminados en la base de datos.");
    process.exit(0);
  }

  console.log(`Se encontraron ${softDeletedUsers.length} usuarios 'eliminados'.`);

  for (const user of softDeletedUsers) {
    try {
      console.log(`Eliminando permanentemente usuario: ${user.username} (ID: ${user.id})...`);
      await db.delete(users).where(eq(users.id, user.id));
      console.log(`Usuario ${user.username} eliminado correctamente.`);
    } catch (e) {
      console.error(`Error al eliminar usuario ${user.username}. ¿Tiene propiedades o mensajes asociados?`, e);
    }
  }

  console.log("Limpieza completada.");
  process.exit(0);
}

main().catch(console.error);
