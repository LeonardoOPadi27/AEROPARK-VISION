# Despliegue de AEROPARK Vision

## 1. Backend en Render

1. Conecta el repositorio y usa el `render.yaml` incluido.
2. Configura `DATABASE_URL` con la URL externa de PostgreSQL.
3. Configura `CORS_ORIGINS` con la URL final del frontend, sin `/` al final.
4. El Dockerfile incluye `best.pt` y `zone_a_best.pt`; `YOLO_WEIGHTS_URL`
   solo sirve como respaldo si falta el modelo general.
5. Configura las variables de R2/S3: `S3_ENDPOINT_URL`, `S3_BUCKET`,
   `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` y `S3_PUBLIC_BASE_URL`.
6. Conserva `ENVIRONMENT=production`. Para permitir el alta desde la app
   estudiantil, configura `ALLOW_PUBLIC_REGISTRATION=true`. El registro solo
   crea cuentas de rol `usuario`; las rutas web administrativas exigen rol
   `administrador`.

El contenedor ejecuta `alembic upgrade head` antes de iniciar FastAPI y expone
`/health` para la comprobacion del servicio.

## 2. Usuario y espacios iniciales

Ejecuta el seed una sola vez contra la base de datos de produccion:

```bash
SEED_ADMIN_EMAIL=admin@example.com \
SEED_ADMIN_PASSWORD='una-clave-larga-y-unica' \
DATABASE_URL='postgresql+psycopg2://...' \
python backend/scripts/seed_db.py
```

El seed crea las zonas A y B con sus capacidades actuales (46 y 73 espacios)
y desactiva los espacios antiguos que ya no pertenecen al modelo.

## 3. Frontend en Cloudflare Pages

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Variable: `VITE_API_BASE_URL=https://<backend-publico>`

## 4. Comprobacion posterior

```bash
curl https://<backend-publico>/health
```

Despues, valida login, carga de imagen, analisis y vista movil desde el
frontend. Las imagenes y los JSON operativos deben usar R2/S3 en produccion;
el almacenamiento local del contenedor no es persistente.

## 5. App del estudiante

La app Expo utiliza `https://aeropark-api.onrender.com` por defecto. Para
probarla con Expo Go, ejecuta `npx expo start` desde `mobile/` y escanea el QR.
El registro de estudiantes requiere `ALLOW_PUBLIC_REGISTRATION=true` en el
servicio Render; revisa el valor efectivo en el panel de Render, porque cambiar
`render.yaml` no modifica necesariamente un servicio creado manualmente.

Para generar un APK instalable en Android, usa el perfil `preview` de
[`mobile/eas.json`](mobile/eas.json) y sigue [`mobile/README.md`](mobile/README.md).
El build de EAS y las notificaciones locales deben validarse en un telefono
antes de considerarlos entregados.

## 6. Reactivacion despues de expirar PostgreSQL

Si Render ya elimino `aeropark-postgres`, pagar una base nueva no recupera sus
usuarios, analisis ni calibraciones manuales. No borrar la base antigua antes
de que termine su plazo de recuperacion si se decide conservar esos datos.

1. Crear una nueva base PostgreSQL en Render y elegir el plan de computo
   acordado. El propietario de la cuenta realiza cualquier pago; no subir
   datos de tarjeta ni URLs de conexion al repositorio.
2. Actualizar `DATABASE_URL` en el servicio `aeropark-api` con la URL de la
   nueva base. Comprobar tambien `CORS_ORIGINS`, las variables de R2/S3 y
   `ALLOW_PUBLIC_REGISTRATION=true` sin publicar sus valores secretos.
3. Desplegar el commit actual. El arranque ejecuta `alembic upgrade head`;
   revisar logs hasta que `/health` responda correctamente.
4. Ejecutar el seed una sola vez con `SEED_ADMIN_EMAIL` y una nueva
   `SEED_ADMIN_PASSWORD` configurados de forma privada. Confirmar las 46
   plazas de Zona A y las 73 de Zona B.
5. Verificar inicio de sesion del administrador, registro de estudiante,
   carga y analisis de una imagen por zona, estados de espacios, reportes y
   notificaciones en un Android. Confirmar que Zona A usa
   `zone_a_best.pt` y que el frontend Cloudflare apunta a la API activa.
