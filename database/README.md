# Base de datos - AeroPark Vision

El proyecto usa PostgreSQL para registrar usuarios, imágenes cargadas, análisis YOLO y resultados derivados de imágenes aéreas previamente capturadas por dron.

Alcance: no se contempla monitoreo permanente en tiempo real, cámaras de seguridad, control de ingreso/salida ni integración con sistemas externos.

## Levantar PostgreSQL local

Desde la raíz del proyecto:

```bash
docker compose up -d postgres
```

## Configurar variables

Crear `backend/.env` usando `backend/.env.example` como base:

```bash
cp backend/.env.example backend/.env
```

La conexión por defecto es:

```txt
DATABASE_URL=postgresql+psycopg2://aeropark:aeropark123@localhost:5432/aeropark_vision
```

## Crear tablas

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

## Cargar datos iniciales

```bash
python scripts/seed_db.py
```

Credenciales de prueba:

```txt
correo: alexis@test.com
contrasena: 123456
```
