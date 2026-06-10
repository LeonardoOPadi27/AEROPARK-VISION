# Dataset base para YOLO

Usa esta estructura para preparar el dataset del proyecto:

```txt
datasets/parking/
├── images/
│   ├── train/
│   └── val/
└── labels/
    ├── train/
    └── val/
```

## Formato de labels

Cada imagen debe tener un `.txt` con una línea por objeto:

```txt
<class_id> <x_center> <y_center> <width> <height>
```

Todos los valores de coordenadas van normalizados entre `0` y `1`.

## Clases sugeridas

- `0`: car
- `1`: motorcycle
- `2`: bus
- `3`: truck

## Archivo YAML

Se dejó plantilla en:

```txt
ai-model/dataset.yaml
```

## Siguiente paso

Cuando tengas imágenes etiquetadas:

```bash
python ai-model/scripts/train.py \
  --data ai-model/dataset.yaml \
  --model yolov8n.pt \
  --epochs 50 \
  --imgsz 640
```
