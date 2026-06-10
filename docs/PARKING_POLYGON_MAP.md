# Mapa de espacios por poligonos

Esta configuracion permite pasar de una ocupacion estimada a una ocupacion por
espacio: `E-001`, `E-002`, `E-003`, etc.

## Archivo esperado

El backend busca este archivo por defecto:

```txt
ai-model/config/parking_spaces.json
```

Tambien se puede cambiar con la variable:

```txt
PARKING_SPACES_MAP_PATH=/ruta/al/mapa.json
```

## Crear el mapa

1. Abre `tools/parking-map-editor.html` en el navegador.
2. Carga una imagen base del estacionamiento.
3. Escribe el codigo del espacio, por ejemplo `E-001`.
4. Haz clic en las esquinas del cajon.
5. Presiona `Guardar`.
6. Repite hasta terminar los espacios.
7. Copia el JSON exportado.
8. Guardalo como `ai-model/config/parking_spaces.json`.
9. Reinicia el backend.

## Como se calcula la ocupacion

Para cada vehiculo detectado por YOLO, el backend toma el centro de la caja:

```txt
center_x = (x1 + x2) / 2
center_y = (y1 + y2) / 2
```

Luego valida si ese punto cae dentro del poligono de cada espacio. Si cae dentro
de `E-014`, ese espacio se marca como ocupado. Los demas quedan libres.

## Formato del JSON

```json
{
  "name": "Estacionamiento Tecsup",
  "image": "DJI_20260312135940_0014_D.JPG",
  "coordinate_system": "image_pixels",
  "spaces": [
    {
      "code": "E-001",
      "polygon": [
        [100, 100],
        [180, 100],
        [180, 180],
        [100, 180]
      ]
    }
  ]
}
```

Mientras no exista `parking_spaces.json`, el sistema conserva el modo estimado.
