#!/bin/bash

# Script completo de despliegue a Google Cloud
set -e

PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION="us-central1"
SERVICE_NAME="virtual-agent"
DB_INSTANCE="virtual-agent-db"

echo "🚀 Iniciando despliegue completo a Google Cloud..."
echo "   Proyecto: $PROJECT_ID"
echo "   Región: $REGION"

# Habilitar APIs necesarias
echo "🔧 Habilitando APIs..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Verificar si la instancia de base de datos existe
if ! gcloud sql instances describe $DB_INSTANCE --quiet >/dev/null 2>&1; then
    echo "📊 Creando instancia de Cloud SQL..."
    gcloud sql instances create $DB_INSTANCE \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-type=SSD \
        --storage-size=10GB \
        --backup-start-time=02:00
    
    echo "🔐 Creando base de datos y usuario..."
    gcloud sql databases create virtualagent --instance=$DB_INSTANCE
    
    echo "⚠️  IMPORTANTE: Configura el usuario de la base de datos:"
    echo "   gcloud sql users create appuser --instance=$DB_INSTANCE --password=TU_PASSWORD"
    echo "   Luego actualiza el secreto database-url con la cadena de conexión correcta"
else
    echo "✅ Instancia de Cloud SQL ya existe"
fi

# Construir y desplegar
echo "🔨 Construyendo y desplegando aplicación..."
gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --min-instances 1 \
    --max-instances 10 \
    --add-cloudsql-instances $PROJECT_ID:$REGION:$DB_INSTANCE \
    --set-env-vars NODE_ENV=production \
    --set-secrets DATABASE_URL=database-url:latest,SENDGRID_API_KEY=sendgrid-api-key:latest,SESSION_SECRET=session-secret:latest

echo "✅ Despliegue completado!"
echo "🌐 URL del servicio:"
gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'
