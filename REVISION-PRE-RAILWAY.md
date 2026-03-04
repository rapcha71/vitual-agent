# Revisión antes de desplegar en Railway

Usá esta checklist para probar la app localmente antes del deploy.

---

## 1. Levantar el servidor

En la carpeta del proyecto:

```bash
npm run dev
```

La app debería estar en **http://localhost:5000**

---

## 2. Checklist de pruebas

### Autenticación
- [ ] **Registro** – Crear cuenta nueva
- [ ] **Login** – Iniciar sesión con usuario existente
- [ ] **Logout** – Cerrar sesión
- [ ] **Recuperar contraseña** (si lo usás)

### Propiedades
- [ ] Ver listado de propiedades
- [ ] Crear/editar propiedad
- [ ] Subir imágenes de propiedad
- [ ] Ver detalle de propiedad

### Mensajes
- [ ] Enviar mensaje al admin
- [ ] Ver mensajes recibidos
- [ ] Marcar como leído
- [ ] (Admin) Responder mensajes

### Admin (si tenés rol admin)
- [ ] Ver dashboard
- [ ] Gestionar usuarios
- [ ] Gestionar propiedades
- [ ] Ver pagos
- [ ] Exportar a Google Sheets

### Integraciones opcionales
- [ ] OCR (Google Vision) – `/api/test-ocr` si lo usás
- [ ] WebAuthn – login con huella/llave
- [ ] Mapas (Google Maps) – En móvil/producción: agregá la URL en restricciones de la API key (ver mensaje de error si falla)

---

## 3. Verificar build de producción

Antes de deployar, probá que el build funcione:

```bash
npm run build
npm start
```

Luego abrí http://localhost:5000 y verificá que todo cargue bien.

---

## 4. Errores frecuentes

| Problema | Solución |
|----------|----------|
| "Database connection failed" | Revisar `DATABASE_URL` en `.env` |
| "Session secret required" | Revisar `SESSION_SECRET` en `.env` |
| CORS al llamar APIs | En local, CORS ya está configurado para localhost |
| Google Sheets/OCR no funciona | Configurar `GOOGLE_SHEETS_CREDENTIALS` y `GOOGLE_SHEETS_ID` si los necesitás |

---

## 5. Listo para Railway

Cuando todo funcione:
1. Subí los cambios a GitHub
2. Seguí los pasos en `MIGRACION-RAILWAY.md`
3. Configurá las variables de entorno en Railway
4. Deployá
