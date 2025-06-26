#!/bin/bash

# Script para configurar Secret Manager de Google Cloud
set -e

PROJECT_ID=${1:-$(gcloud config get-value project)}
REGION="us-central1"
DB_INSTANCE="virtual-agent-db"

echo "🔐 Configurando Secret Manager para Virtual Agent..."
echo "   Proyecto: $PROJECT_ID"

# Habilitar Secret Manager API
echo "🔧 Habilitando Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

# Función para crear o actualizar secreto
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if gcloud secrets describe $secret_name --quiet >/dev/null 2>&1; then
        echo "⚠️  El secreto '$secret_name' ya existe. ¿Deseas actualizarlo? (y/N)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo -n "$secret_value" | gcloud secrets versions add $secret_name --data-file=-
            echo "✅ Secreto '$secret_name' actualizado"
        else
            echo "⏭️  Saltando '$secret_name'"
        fi
    else
        echo -n "$secret_value" | gcloud secrets create $secret_name --data-file=-
        echo "✅ Secreto '$secret_name' creado"
    fi
}

# Obtener PROJECT_NUMBER para los permisos
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

echo "📋 Configurando secretos..."

# 1. Database URL
echo "🗄️  Configurando DATABASE_URL..."
echo "Introduce la contraseña para el usuario 'appuser' de la base de datos:"
read -s DB_PASSWORD
DB_URL="postgresql://appuser:$DB_PASSWORD@/virtualagent?host=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE"
create_or_update_secret "database-url" "$DB_URL"

# 2. SendGrid API Key
echo "📧 Configurando SENDGRID_API_KEY..."
echo "Introduce tu API key de SendGrid:"
read -s SENDGRID_KEY
create_or_update_secret "sendgrid-api-key" "$SENDGRID_KEY"

# 3. Session Secret
echo "🔑 Configurando SESSION_SECRET..."
echo "Introduce tu session secret (o presiona Enter para generar uno aleatorio):"
read -s SESSION_SECRET
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -base64 32)
    echo "✅ Session secret generado automáticamente"
fi
create_or_update_secret "session-secret" "$SESSION_SECRET"

# Configurar permisos para Cloud Run
echo "🔐 Configurando permisos de acceso..."

# Dar permisos al servicio de Cloud Run por defecto
COMPUTE_SERVICE_ACCOUNT="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

for secret in "database-url" "sendgrid-api-key" "session-secret"; do
    echo "   Configurando permisos para $secret..."
    gcloud secrets add-iam-policy-binding $secret \
        --member="serviceAccount:$COMPUTE_SERVICE_ACCOUNT" \
        --role="roles/secretmanager.secretAccessor" \
        --quiet
done

echo ""
echo "✅ Configuración de Secret Manager completada!"
echo ""
echo "📋 Secretos configurados:"
echo "   - database-url"
echo "   - sendgrid-api-key" 
echo "   - session-secret"
echo ""
echo "🚀 Ya puedes ejecutar el despliegue con:"
echo "   ./deploy-complete.sh"
