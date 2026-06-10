# Preparación del dataset YOLO para AeroPark Vision

La estructura de entrenamiento ya quedó creada en:

```txt
datasets/parking/
├── images/
│   ├── train/
│   └── val/
└── labels/
    ├── train/
    └── val/
```

## Qué va en cada carpeta

- `images/train/`: imágenes para entrenamiento
- `images/val/`: imágenes para validación
- `labels/train/`: etiquetas `.txt` de cada imagen de entrenamiento
- `labels/val/`: etiquetas `.txt` de cada imagen de validación

## Regla importante

Cada imagen debe tener su archivo `.txt` con el mismo nombre.

Ejemplo:

```txt
images/train/parking_001.jpg
labels/train/parking_001.txt
```

## Formato de cada línea YOLO

```txt
<class_id> <x_center> <y_center> <width> <height>
```

Todos los valores de posición deben estar normalizados entre `0` y `1`.

Ejemplo:

```txt
0 0.512 0.438 0.121 0.089
0 0.644 0.517 0.107 0.081
```

## Clases usadas por ahora

```txt
0 car
1 motorcycle
2 bus
3 truck
```

## Recomendación de reparto

- `80%` imágenes a `train`
- `20%` imágenes a `val`

## Comprobación rápida antes de entrenar

1. Que el número de imágenes y labels coincida
2. Que no haya imágenes sin `.txt`
3. Que no haya `.txt` vacíos si realmente hay vehículos visibles

## Cuando ya tengas datos

Desde la raíz del proyecto:

```bash
source backend/.venv/bin/activate
python ai-model/scripts/train.py \
  --data ai-model/dataset.yaml \
  --model yolov8n.pt \
  --epochs 50 \
  --imgsz 640
```
