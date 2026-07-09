# AeroPark Vision

AeroPark Vision es un sistema inteligente para apoyar la gestion de estacionamientos en Tecsup mediante imagenes aereas capturadas por dron, vision por computadora e inteligencia artificial.

El sistema no busca hacer monitoreo continuo en tiempo real. Su flujo principal es procesar imagenes capturadas periodicamente, estimar la ocupacion del estacionamiento y mostrar resultados utiles para administradores y usuarios.

## Que hace el proyecto

- Detecta vehiculos en imagenes aereas usando YOLOv8.
- Diferencia autos y motocicletas.
- Estima espacios libres y ocupados mediante mapas fisicos por zona.
- Clasifica colores predominantes de vehiculos detectados.
- Muestra indicadores, historial, reportes y disponibilidad en una web administrativa.
- Permite que usuarios consulten disponibilidad y marquen/liberen espacios desde una app mobile.

## Estado actual

Primera version funcional del sistema:

- Web administrativa con modo dark/light, dashboard, carga de imagenes, analisis, colores, espacios, reportes y configuracion.
- Backend FastAPI conectado a PostgreSQL.
- Modulo IA preparado para deteccion YOLOv8 y clasificacion de color.
- App mobile Expo orientada al usuario final.
- Visualizacion fisica de Zona A y Zona B segun la distribucion real del estacionamiento.
- Zona C retirada del flujo porque no cuenta con lineas fisicas claras de estacionamiento.

## Arquitectura general

```txt
Dron
  -> captura imagenes aereas

Web administrativa
  -> sube imagenes y consulta resultados

Backend FastAPI
  -> autentica usuarios, guarda informacion y coordina analisis

Modulo IA YOLOv8 + OpenCV
  -> detecta vehiculos, calcula ocupacion y clasifica colores

PostgreSQL + almacenamiento de imagenes
  -> conserva usuarios, analisis, espacios, reportes e imagenes

App mobile
  -> consulta disponibilidad y permite marcar/liberar espacios
```

## Modulos principales

| Modulo | Descripcion |
| --- | --- |
| Frontend web | Panel administrativo para cargar imagenes, ver analisis, espacios, colores, reportes y configuracion. |
| Backend API | API REST en FastAPI para autenticacion, imagenes, analisis, espacios, reportes, mobile y configuracion. |
| IA / YOLOv8 | Procesamiento de imagenes, deteccion de vehiculos y clasificacion por color. |
| Base de datos | PostgreSQL en Docker para persistir informacion del sistema. |
| App mobile | Aplicacion Expo para usuarios que consultan disponibilidad y reportan ocupacion manual. |
| Dataset | Documentacion y preparacion de imagenes para entrenamiento/validacion. |
| Herramientas | Utilidades como editor de poligonos y scripts de pruebas. |

## Tecnologias utilizadas

| Tecnologia | Uso en el proyecto |
| --- | --- |
| React + Vite | Construccion de la web administrativa. |
| Tailwind CSS | Estilos, layout, modo dark/light y diseño visual. |
| FastAPI | Backend REST para web, mobile e integracion con IA. |
| PostgreSQL | Base de datos principal en desarrollo con Docker. |
| SQLAlchemy | Conexion y consultas a la base de datos desde Python. |
| YOLOv8 | Deteccion de autos y motocicletas en imagenes aereas. |
| OpenCV | Lectura, recorte y apoyo al procesamiento visual de imagenes. |
| Expo + React Native | App mobile para usuarios finales. |
| Recharts | Graficos del dashboard y reportes. |
| Docker Compose | Levantar PostgreSQL localmente. |

## Estructura del repositorio

```txt
AEROPARK-VISION/
├── backend/      # API FastAPI, rutas, servicios y modelos
├── frontend/     # Web administrativa React + Vite
├── mobile/       # App mobile Expo
├── ai-model/     # Scripts, pesos y resultados del modelo IA
├── datasets/     # Documentacion y preparacion del dataset
├── database/     # Recursos relacionados a base de datos
├── docs/         # Documentacion del flujo, pruebas y arquitectura
├── tools/        # Herramientas auxiliares
└── docker-compose.yml
```

## Requisitos

- Node.js
- npm
- Python 3.11+
- Docker Desktop
- Git

## Ejecucion local

### 1. Levantar PostgreSQL

Desde la raiz del proyecto:

```bash
docker compose up -d
```

PostgreSQL queda disponible en:

```txt
localhost:5433
```

### 2. Levantar backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Endpoint de prueba:

```txt
http://127.0.0.1:8000/health
```

Documentacion interactiva de FastAPI:

```txt
http://127.0.0.1:8000/docs
```

### 3. Levantar web administrativa

```bash
cd frontend
npm install
npm run dev
```

La web queda disponible en:

```txt
http://localhost:5173
```

### 4. Levantar app mobile

```bash
cd mobile
npm install
npx expo start
```

Para probar en navegador:

```bash
npm run web
```

Si se prueba desde un celular fisico, configurar la URL del backend con la IP local del equipo:

```bash
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000 npx expo start
```

## Variables de entorno

Archivos de referencia:

- `backend/.env.example`
- `frontend/.env.example`

Backend recomendado para Docker local:

```env
DATABASE_URL=postgresql+psycopg2://aeropark:aeropark123@localhost:5433/aeropark_vision
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
SECRET_KEY=change_this_secret_in_production
YOLO_WEIGHTS_PATH=../ai-model/weights/best.pt
PARKING_SPACES_MAP_PATH=../ai-model/config/parking_spaces.json
```

Frontend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Credenciales de prueba

```txt
Correo: alexis@test.com
Contraseña: 123456
```

## Funcionalidades web

- **Dashboard:** resumen del ultimo analisis, vehiculos detectados, ocupacion, colores e imagen reciente.
- **Cargar imagenes:** subida de imagenes aereas por zona para procesar con IA.
- **Analisis:** historial de imagenes procesadas y estado del modelo.
- **Espacios libres:** vista de disponibilidad por Zona A y Zona B, con plano fisico ampliado.
- **Colores:** distribucion de colores detectados en vehiculos.
- **Reportes:** indicadores operativos, comparacion por zona y exportacion CSV.
- **Configuracion:** parametros de experiencia mobile para ocupacion, liberacion y confirmacion.

## Funcionalidades mobile

- Consulta rapida de zonas con espacios disponibles.
- Visualizacion fisica de espacios por Zona A y Zona B.
- Seleccion de espacio ocupado.
- Tiempo estimado de permanencia.
- Liberacion del espacio al retirarse.
- Estado de espacio activo del usuario.
- Base para recordatorios y confirmaciones.

## Pruebas

Frontend:

```bash
cd frontend
npm run build
```

Mobile:

```bash
cd mobile
npx expo export --platform web --output-dir /tmp/aeropark-mobile-export
```

Pruebas de estres del backend:

```bash
cd backend
python scripts/stress_test.py
```

Documentacion:

- `docs/STRESS_TESTS.md`

## Notas importantes

- El sistema depende de imagenes aereas capturadas bajo demanda, no de camaras en vivo.
- La disponibilidad se actualiza a partir del ultimo analisis y de reportes manuales desde la app mobile.
- Zona C fue retirada de la visualizacion principal porque no tiene espacios fisicos delimitados.
- Para produccion se recomienda migrar almacenamiento de imagenes a cloud y usar un proveedor administrado de base de datos.

## Autor

Proyecto desarrollado como parte de una propuesta academica para Tecsup.
