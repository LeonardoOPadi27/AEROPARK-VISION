# División inicial train / val

Se hizo una primera división del dataset para entrenamiento de YOLO usando nombres más limpios.

## Train

- `e2_0011.jpg` -> `estacionamiento_2_principal`
- `e2_0013.jpg` -> `estacionamiento_2_principal`
- `e2_0014.jpg` -> `estacionamiento_2_principal`
- `e3_0033.jpg` -> `estacionamiento_3_lateral`

## Val

- `e2_0012.jpg` -> `estacionamiento_2_principal`

## Criterio usado

- mantener imágenes de más de una zona en entrenamiento
- dejar validación con tomas distintas, no sólo repeticiones del mismo encuadre
- conservar nombres cortos para que luego el etiquetado y los labels sean más manejables

## Siguiente paso

Etiquetar estas imágenes y crear los archivos:

```txt
datasets/parking/labels/train/e2_0011.txt
...
datasets/parking/labels/val/e2_0012.txt
```
