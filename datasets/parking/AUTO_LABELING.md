# Auto-etiquetado inicial

Se puede generar una primera versión de labels usando un modelo YOLO preentrenado en COCO.

Este paso no reemplaza la revisión humana. Sirve para acelerar el inicio del dataset.

## Comando

Desde la raíz del proyecto:

```bash
source backend/.venv/bin/activate
python ai-model/scripts/auto_label.py \
  --dataset datasets/parking \
  --model yolov8n.pt \
  --conf 0.25 \
  --imgsz 1280
```

## Clases generadas

El script convierte clases COCO a las clases locales:

```txt
car -> 0
motorcycle -> 1
bus -> 2
truck -> 3
```

## Revisión obligatoria

Antes de entrenar, revisa:

- cajas que falten
- cajas sobre objetos que no sean vehículos
- vehículos muy pequeños no detectados
- vehículos parcialmente cortados en bordes de imagen

## Después de revisar

Entrenar:

```bash
python ai-model/scripts/train.py \
  --data ai-model/dataset.yaml \
  --model yolov8n.pt \
  --epochs 50 \
  --imgsz 640
```
