
import { storage } from '../server/storage';
import { mediaService } from '../server/services/media-service';
import { logger } from '../server/lib/logger';
import { db } from '../server/db';
import { properties } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function migrateImages() {
  logger.info("--- Iniciando Migración de Imágenes (WPO) ---");

  try {
    const allUsers = await storage.getAllUsers();
    for (const user of allUsers) {
      const userProperties = await storage.getPropertiesByUserId(user.id);
      logger.info(`Procesando ${userProperties.length} propiedades del usuario ${user.username}`);

      for (const prop of userProperties) {
        // Skip if already has thumbnails
        if (prop.thumbnails && prop.thumbnails.length > 0) {
          logger.info(`Propiedad ${prop.propertyId} ya tiene thumbnails, saltando.`);
          continue;
        }

        let imagesData = prop.images;
        if (typeof imagesData === 'string') {
          try {
            imagesData = JSON.parse(imagesData);
          } catch {
            imagesData = [];
          }
        }

        const imagesArray: string[] = Array.isArray(imagesData) 
          ? imagesData 
          : (typeof imagesData === 'object' && imagesData !== null ? Object.values(imagesData) : []);

        if (imagesArray.length === 0) {
          continue;
        }

        logger.info(`Generando thumbnails para propiedad ${prop.propertyId} (${imagesArray.length} imágenes)...`);
        
        const newImages: string[] = [];
        const newThumbnails: string[] = [];
        const newBlurhashes: string[] = [];

        for (const imgBase64 of imagesArray) {
          if (typeof imgBase64 !== 'string' || !imgBase64.startsWith('data:')) continue;
          try {
            const { optimized, thumbnail, blurhash } = await mediaService.processImage(imgBase64);
            newImages.push(optimized);
            newThumbnails.push(thumbnail);
            newBlurhashes.push(blurhash);
          } catch (err) {
            logger.error(`Error procesando imagen para ${prop.propertyId}:`, err);
          }
        }

        if (newThumbnails.length > 0) {
          await db.update(properties)
            .set({
              images: newImages,
              thumbnails: newThumbnails,
              blurhashes: newBlurhashes
            })
            .where(eq(properties.id, prop.id));
          logger.info(`✅ Propiedad ${prop.propertyId} actualizada.`);
        }
      }
    }
    logger.info("--- Migración Completada ---");
  } catch (error) {
    logger.error("Error en la migración:", error);
  } finally {
    process.exit(0);
  }
}

migrateImages();
