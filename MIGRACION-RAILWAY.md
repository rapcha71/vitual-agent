# Migración de Replit a Railway

## ¿Por qué Railway y no Vercel?

Tu app **vitual-agent** tiene una arquitectura **Express + Vite** (servidor Node con sesiones, base de datos, etc.). 

| Plataforma | Soporte | Costo |
|------------|---------|-------|
| **Vercel** | Pensado para Next.js y sitios estáticos. Express con sesiones requiere reescritura importante. | Gratis para estáticos |
| **Railway** | Soporta Node/Express tal cual. Deploy directo sin cambios grandes. | $5 crédito/mes gratis, luego ~$5-20/mes |
| **Render** | Similar a Railway. Plan gratuito con limitaciones. | Gratis (con sleep) o $7/mes |

**Recomendación: Railway** — migración rápida, sin reescribir, 24/7 estable.

---

## Arquitectura actual

- **Client**: React + Vite + Tailwind
- **Server**: Express con Passport, sesiones (connect-pg-simple), multer
- **DB**: Neon PostgreSQL (ya compatible con serverless)
- **Integraciones**: Google Sheets, Google Vision (OCR), WebAuthn

---

## Pasos para migrar a Railway

### 1. Crear cuenta en Railway

- Entrá a [railway.app](https://railway.app)
- Registrate con GitHub

### 2. Nuevo proyecto desde GitHub

- New Project → Deploy from GitHub
- Conectá el repo `rapcha71/vitual-agent`
- Railway detecta Node.js automáticamente

### 3. Variables de entorno

En Railway → tu proyecto → Variables, agregá:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de Neon (la que ya usás en Replit) |
| `SESSION_SECRET` | Cadena aleatoria larga para sesiones (ej. `openssl rand -hex 32`) |
| `APP_URL` | **Después del primer deploy**: la URL que te da Railway (ej. `https://vitual-agent-production.up.railway.app`). Necesaria para WebAuthn y cookies. |
| `GOOGLE_SHEETS_CREDENTIALS` | JSON de credenciales (si usás Google Sheets) |
| `GOOGLE_SHEETS_ID` | ID del spreadsheet (si usás) |

Railway setea automáticamente `NODE_ENV=production`.

### 4. Build & Start

Railway usa por defecto:
- **Build**: `npm run build` 
- **Start**: `npm start`

Verificá que `package.json` tenga scripts correctos (ver cambios en el repo).

### 5. Dominio y APP_URL

- Railway asigna una URL automática (ej. `https://vitual-agent-production-xxxx.up.railway.app`)
- **Importante**: Una vez desplegado, agregá la variable `APP_URL` con esa URL exacta y redeployá. Es necesaria para WebAuthn y cookies seguras.
- Podés conectar un dominio propio en Settings → Domains (ej. `tudominio.com`)

---

## Cambios realizados en el código

1. **CORS**: Permite el dominio de Railway además de Replit
2. **WebAuthn**: Configuración para el dominio de producción
3. **Vite**: Plugins de Replit condicionados para no romper el build
4. **Scripts**: `start` compatible con Linux (Railway)

---

## Después del deploy

1. Probá login, registro, propiedades, mensajes
2. Revisá que el OCR funcione (si usás Google Vision)
3. Conectá tu dominio si tenés uno
4. Desactivá o bajá el plan de Replit cuando todo funcione bien
