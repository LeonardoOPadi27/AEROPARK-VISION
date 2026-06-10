# Preparacion para app mobile

La app mobile debe consumir el mismo backend FastAPI que usa la web.

## Backend en red local

Desde `backend`:

```bash
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Busca la IP local de la computadora:

```bash
ipconfig getifaddr en0
```

En la app mobile usa:

```txt
http://TU_IP_LOCAL:8000
```

Ejemplo:

```txt
http://192.168.1.50:8000
```

## CORS

Configura `backend/.env`:

```txt
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

Para desarrollo mobile normalmente las llamadas se hacen desde React Native y no
desde un navegador, pero esta variable mantiene controlado el acceso de la web.

## Endpoints base

```txt
GET /health
POST /auth/login
POST /images/upload
GET /images
GET /images/latest
GET /analysis
GET /analysis/latest
GET /parking-spaces/latest
GET /vehicle-colors/latest
GET /vehicle-colors/summary
```

## Imagenes

Si el backend devuelve:

```txt
/uploads/foto.jpg
```

La app mobile debe mostrar:

```txt
http://TU_IP_LOCAL:8000/uploads/foto.jpg
```

## Stack recomendado

- React Native + Expo
- Axios para API
- Expo SecureStore para token
- Expo ImagePicker para galeria/camara
- Backend FastAPI para IA y base de datos
