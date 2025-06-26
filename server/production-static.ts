import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Configuración de archivos estáticos para producción en Google Cloud
 * Maneja el servido del frontend React construido
 */
export function serveProductionStatic(app: Express) {
  // Rutas posibles para archivos estáticos (Google Cloud vs desarrollo)
  const possiblePaths = [
    path.resolve(__dirname, "../public"),        // Para Google Cloud (con nuevo Dockerfile)
    path.resolve(__dirname, "../../client/dist"), // Para desarrollo local
    path.resolve(__dirname, "./public"),         // Alternativa
  ];
  
  let staticPath = null;
  
  // Buscar la ruta correcta
  for (const possiblePath of possiblePaths) {
    console.log(`[Production] Verificando ruta: ${possiblePath}`);
    if (fs.existsSync(possiblePath)) {
      const indexPath = path.join(possiblePath, "index.html");
      if (fs.existsSync(indexPath)) {
        staticPath = possiblePath;
        console.log(`[Production] Archivos estáticos encontrados en: ${staticPath}`);
        break;
      }
    }
  }
  
  if (!staticPath) {
    console.error(`[Production] No se encontraron archivos estáticos en ninguna ruta`);
    console.error(`[Production] Rutas verificadas: ${possiblePaths.join(", ")}`);
    
    // Crear un index.html mínimo como fallback para evitar crash
    const fallbackPath = path.resolve(__dirname, "../fallback");
    const fallbackIndex = path.join(fallbackPath, "index.html");
    
    if (!fs.existsSync(fallbackPath)) {
      fs.mkdirSync(fallbackPath, { recursive: true });
    }
    
    fs.writeFileSync(fallbackIndex, `
<!DOCTYPE html>
<html>
<head>
    <title>Virtual Agent - Iniciando...</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .loading { color: #666; }
    </style>
</head>
<body>
    <h1>Virtual Agent</h1>
    <p class="loading">Aplicación iniciando...</p>
    <p>Si ves este mensaje, la aplicación se está cargando correctamente.</p>
</body>
</html>
    `);
    
    staticPath = fallbackPath;
    console.log(`[Production] Usando fallback HTML en: ${staticPath}`);
  }
  
  // Verificar que index.html existe
  const indexPath = path.join(staticPath, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `index.html not found in ${staticPath}. Frontend build may have failed.`
    );
  }
  
  console.log(`[Production] Serving static files from: ${staticPath}`);
  
  // Servir archivos estáticos con cache headers para producción
  app.use(express.static(staticPath, {
    maxAge: '1d', // Cache por 1 día
    etag: true,
    lastModified: true
  }));
  
  // Servir assets con cache más largo
  app.use('/assets', express.static(path.join(staticPath, 'assets'), {
    maxAge: '1y', // Cache por 1 año para assets con hash
    immutable: true
  }));
  
  // Catch-all handler: envía index.html para cualquier ruta no API
  // Esto es crítico para que el routing del lado cliente (wouter) funcione
  app.get('*', (req, res) => {
    // No interceptar rutas de API
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    console.log(`[Production] Serving index.html for route: ${req.path}`);
    res.sendFile(indexPath);
  });
  
  console.log(`[Production] Static file serving configured successfully`);
}
