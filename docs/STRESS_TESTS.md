# Pruebas de estres de la API

Estas pruebas evalúan el comportamiento del backend de AeroPark Vision ante
consultas simultáneas. Están enfocadas en los endpoints más usados por la web y
la app móvil.

## Alcance

La prueba por defecto usa endpoints de lectura para no alterar el estado del
estacionamiento:

- `GET /mobile/parking-overview`
- `GET /analysis`
- `GET /analysis/latest`
- `GET /reports/overview`
- `GET /vehicle-colors/summary`
- `GET /vehicle-colors/latest`
- `GET /parking-spaces/latest`
- `GET /images/latest`
- `GET /settings/overview` si el login funciona
- `GET /auth/me` si el login funciona

No se incluye la carga masiva de imágenes porque esa operación depende del peso
del archivo, del modelo YOLOv8 y del hardware disponible.

## Preparación

1. Levantar la base de datos:

```bash
docker compose up -d
```

2. Levantar el backend:

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

3. En otra terminal, ejecutar la prueba:

```bash
cd backend
source .venv/bin/activate
python scripts/stress_test.py --host http://127.0.0.1:8000 --users 20 --duration 30 --spawn-rate 5
```

## Escenarios sugeridos

### Prueba suave

```bash
python scripts/stress_test.py --users 10 --duration 30 --spawn-rate 5
```

Sirve para validar que la API responde correctamente con carga moderada.

### Prueba media

```bash
python scripts/stress_test.py --users 50 --duration 60 --spawn-rate 10
```

Sirve para simular varios usuarios móviles consultando disponibilidad al mismo
tiempo.

### Prueba alta local

```bash
python scripts/stress_test.py --users 100 --duration 60 --spawn-rate 20
```

Sirve para observar el límite aproximado del entorno local. Los resultados
dependen del equipo, la base de datos y si el backend se ejecuta con recarga o
modo normal.

## Exportar resultados

```bash
python scripts/stress_test.py --users 50 --duration 60 --csv ../docs/stress-results.csv
```

El CSV incluye endpoint, estado HTTP, tiempo de respuesta y errores.

## Métricas principales

- Requests totales
- Requests exitosos
- Errores
- Requests por segundo
- Tiempo promedio
- p50
- p95
- p99
- Errores por endpoint

## Texto para el informe

Las pruebas de estrés se realizaron sobre la API REST del sistema, simulando
múltiples usuarios concurrentes que consultan disponibilidad, análisis,
reportes, colores y espacios. El objetivo fue evaluar la estabilidad del
backend ante solicitudes simultáneas y observar los tiempos de respuesta de los
endpoints principales.

Estas pruebas no buscan medir el rendimiento del modelo YOLOv8 durante carga
masiva de imágenes, sino validar la capacidad de respuesta de los servicios que
consumen la aplicación web administrativa y la aplicación móvil.

## Resultados obtenidos

Pruebas ejecutadas en entorno local con PostgreSQL en Docker y backend FastAPI
en `http://127.0.0.1:8000`.

| Escenario | Usuarios virtuales | Duracion | Requests | Exitosos | Errores | Req/s | Promedio | p95 | p99 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Suave | 20 | 30 s | 2090 | 2087 | 3 | 69.67 | 113.5 ms | 321.3 ms | 1116.0 ms |
| Medio | 50 | 60 s | 5389 | 5389 | 0 | 89.82 | 383.5 ms | 886.7 ms | 1320.4 ms |
| Alto local | 100 | 60 s | 5639 | 5639 | 0 | 93.98 | 874.4 ms | 1636.8 ms | 2035.1 ms |

Archivos generados:

- `docs/stress-results-20u.csv`
- `docs/stress-results-50u.csv`
- `docs/stress-results-100u.csv`

Observación: en el escenario suave se registraron 3 timeouts puntuales en
`GET /settings/overview`. En los escenarios de 50 y 100 usuarios no se
registraron errores. El aumento de tiempo de respuesta en el escenario de 100
usuarios es esperable por tratarse de una prueba ejecutada en entorno local.
