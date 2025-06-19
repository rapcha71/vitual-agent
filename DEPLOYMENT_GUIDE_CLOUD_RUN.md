# Virtual Agent - Guía de Despliegue en Google Cloud Run

## Configuración Optimizada Completada

Tu aplicación Virtual Agent ahora está completamente optimizada para Google Cloud Run con:

### ✅ Archivos de Configuración Creados:
- `Dockerfile` - Containerización optimizada con Node.js 18 Alpine
- `.dockerignore` - Exclusiones para build eficiente 
- `cloudbuild.yaml` - CI/CD automático con Cloud Build
- `app.yaml` - Configuración alternativa para App Engine
- `tsconfig.server.json` - Compilación TypeScript para servidor

### 🔧 Optimizaciones Aplicadas:
- Puerto dinámico para Cloud Run (8080 por defecto)
- Variables de entorno optimizadas para producción
- Build multi-etapa para imagen ligera
- Usuario no-root para seguridad
- Auto-scaling configurado (0-10 instancias)

### 🚀 Comandos para Despliegue:

#### Opción 1: Despliegue Directo
```bash
# Desde el directorio del proyecto
gcloud run deploy virtual-agent \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1
```

#### Opción 2: Con Docker Build
```bash
# Build local
docker build -t virtual-agent .

# Tag para Google Container Registry
docker tag virtual-agent gcr.io/TU-PROJECT-ID/virtual-agent

# Push a registry
docker push gcr.io/TU-PROJECT-ID/virtual-agent

# Deploy a Cloud Run
gcloud run deploy virtual-agent \
  --image gcr.io/TU-PROJECT-ID/virtual-agent \
  --region us-central1 \
  --allow-unauthenticated
```

#### Opción 3: Con Cloud Build (Automático)
```bash
# Trigger build automático desde repositorio
gcloud builds submit --config cloudbuild.yaml
```

### 🔐 Variables de Entorno Requeridas:
```bash
# Configura en Cloud Run Console o CLI:
DATABASE_URL=tu_postgresql_url
SENDGRID_API_KEY=tu_sendgrid_key
GITHUB_PERSONAL_ACCESS_TOKEN=tu_github_token
SESSION_SECRET=tu_session_secret_seguro
NODE_ENV=production
```

### 📊 Recursos Recomendados:
- **CPU:** 1 vCPU
- **Memoria:** 512Mi 
- **Instancias:** 0-10 (auto-scaling)
- **Timeout:** 300 segundos
- **Concurrencia:** 80 solicitudes por instancia

### 🌐 Características Cloud-Ready:
- Health checks automáticos (`/api/health`)
- Logs estructurados para Cloud Logging
- Graceful shutdown con señales SIGTERM
- Monitoring endpoints para métricas
- Sistema de supervivencia adaptado para serverless

### 🔄 Próximos Pasos:
1. Actualizar repositorio GitHub con versión optimizada
2. Configurar proyecto en Google Cloud Console
3. Establecer base de datos PostgreSQL (Cloud SQL)
4. Ejecutar despliegue inicial
5. Configurar dominio personalizado (opcional)

La aplicación mantiene todas las funcionalidades:
- Sistema de propiedades con tipos de operación
- Autenticación y autorización
- Panel administrativo
- Visualización de mapas
- Upload de imágenes
- Sistemas de estabilidad adaptados

¡Lista para producción en Google Cloud Run!