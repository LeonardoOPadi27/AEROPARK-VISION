# Calibracion por espacio

La web y la app consumen los mismos estados de `/mobile/parking-overview`.
Cada calibracion vincula codigos A-001..A-046 o B-001..B-073 con cuatro
esquinas sobre una foto concreta. Se guarda en PostgreSQL en
`configuracion_sistema`, bajo `parking_calibration:<id_imagen>`.
No requiere una tabla ni una migracion nueva sobre el esquema operativo actual.

## Uso

1. Abrir **Espacios libres > Calibrar zona A/B** con una cuenta administradora.
2. Seleccionar la foto. Revisar la zona que se asignara al guardar.
3. Seleccionar el codigo del espacio; el desplegable **Referencia del plano**
   permite identificar su lugar en el dibujo.
4. Marcar las cuatro esquinas sobre la foto en orden alrededor del espacio.
   Confirmar con el icono de verificacion. El selector avanza al siguiente codigo.
5. Guardar. Los estados se recalculan usando las detecciones ya almacenadas;
   no hace falta ejecutar YOLO otra vez para modificar los poligonos.

El editor permite zoom, ocultar detecciones, deshacer puntos y quitar poligonos.
Para otra foto, **Reutilizar calibracion** carga una referencia como borrador.
Hay que comprobar el encuadre y ajustar las esquinas antes de guardar.
La calibracion guardada para una foto tiene prioridad sobre la plantilla
automatica de su zona. No se reutiliza de forma silenciosa sobre otra foto.

## Interpretacion

- Rojo: centro de una deteccion dentro de ese espacio.
- Verde: espacio calibrado sin detecciones ni solapamientos ambiguos.
- Gris: fuera de la parte visible de la plantilla, sin detalles de deteccion o
  con asignacion ambigua.
- Celeste/ambar: reporte de la app; prevalece sobre el estado de la foto.

Son resultados de la ultima imagen analizada de cada zona, no observaciones
en tiempo real. Revisar su fecha antes de usarlos para disponibilidad actual.
Un falso negativo de YOLO puede producir un espacio verde incorrecto; validar
con fotos etiquetadas, especialmente motos, sombras y vehiculos parcialmente visibles.

Se usa OpenCV para validar poligonos convexos, comprobar centros e intersecciones:
https://docs.opencv.org/4.x/d3/dc0/group__imgproc__shape.html
Una deteccion sobre un limite o que invade otra plaza deja la parte ambigua
sin confirmar. Varias detecciones en un espacio cuentan como una ocupacion.
Los reportes manuales se combinan por codigo, sin duplicar plazas ocupadas.

Los totales `located_free_spaces` y `located_occupied_spaces` cuentan estados
ubicados; sumados a `unknown_spaces` dan la capacidad completa. La plantilla
revisada de cada zona se aplica automaticamente al subir una toma de dron;
calibrar solo sirve para ajustar su geometria. El conteo de vehiculos del
analisis puede diferir de los espacios ocupados: incluye detecciones fuera de
las plazas y posibles detecciones duplicadas.

## Referencias Iniciales

`backend/scripts/calibrate_reference_images.py` contiene la calibracion inicial
de la imagen A `pruebaimagen.png` y la adaptacion parcial del mapa B existente.
Comprueba SHA-256 de los archivos, no sus nombres, antes de aplicar datos.
La asignacion de B sigue el orden espacial de las filas del plano redibujado;
debe contrastarse con la numeracion de campo si existe una numeracion oficial.
Estas calibraciones son un punto de partida revisable, no una medicion topografica.

La referencia A vincula 46 espacios. La referencia B vincula 56 de 73:
9 longitudinales, 25 de la fila central y 22 de la fila exterior.
Los 17 restantes requieren ampliar la calibracion sobre una foto que los muestre.
Otros espacios pueden quedar grises por detecciones ambiguas.

Desde `backend/`:

```sh
.venv/bin/python -m scripts.calibrate_reference_images --preview-dir /tmp/aeropark-calibration
.venv/bin/python -m scripts.calibrate_reference_images --apply
```

El script conserva calibraciones existentes. Al asignar una zona a una foto,
guarda el valor anterior en `parking_calibration_original_zone:<id_imagen>`.
No elimina imagenes, analisis ni reportes. En el entorno local las fotos 15 y
16 corresponden a B; la 16 estaba marcada como A.

## Verificacion

```sh
cd backend
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m unittest discover -s tests -v
```

Las pruebas usan SQLite en memoria. Cubren permisos HTTP, persistencia,
integridad geometrica, bordes, duplicados, mezcla con reportes, cobertura parcial
y rechazo de calibraciones de otra imagen/zona.
