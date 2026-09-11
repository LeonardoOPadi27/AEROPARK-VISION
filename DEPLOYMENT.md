# Despliegue de AEROPARK Vision

## 1. Backend en Render

1. Conecta el repositorio y usa el `render.yaml` incluido.
2. Configura `DATABASE_URL` con la URL externa de PostgreSQL.
3. Configura `CORS_ORIGINS` con la URL final del frontend, sin `/` al final.
4. Configura `YOLO_WEIGHTS_URL` con una URL accesible al archivo `best.pt`.
5. Configura las variables de R2/S3: `S3_ENDPOINT_URL`, `S3_BUCKET`,
   `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` y `S3_PUBLIC_BASE_URL`.
6. Conserva `ENVIRONMENT=production` y no habilites
   `ALLOW_PUBLIC_REGISTRATION` salvo que el registro abierto sea necesario.

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
