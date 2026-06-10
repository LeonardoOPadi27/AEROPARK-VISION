# Flujo con Roboflow (AeroPark Vision)

Esta guía define un flujo simple para pasar de imágenes crudas a entrenamiento YOLO.

## 1. Subir imágenes a Roboflow

Sube las imágenes de:

- `datasets/parking/images/train`
- `datasets/parking/images/val`

Puedes subir juntas o por lotes.

## 2. Crear proyecto

En Roboflow:

- tipo: `Object Detection`
- nombre sugerido: `aeropark-vision`
- clases:
  - `car`
  - `motorcycle`
  - `bus`
  - `truck`

## 3. Etiquetar y revisar

Anota vehículos en todas las imágenes.

Antes de exportar, revisa:

- que no falten vehículos visibles
- que no existan cajas fuera del objeto
- consistencia en clases (no mezclar `car` con `truck` por error)

## 4. Exportar desde Roboflow

Exporta en formato:

- `YOLOv8 PyTorch`

Cuando descargues el `.zip`, descomprímelo en un temporal, por ejemplo:

```bash
mkdir -p /tmp/rf_export
unzip ~/Downloads/aeropark-vision.zip -d /tmp/rf_export
```

## 5. Copiar al dataset local

Copia el contenido exportado de Roboflow al dataset local:

```bash
cp -R /tmp/rf_export/train/images/* datasets/parking/images/train/
cp -R /tmp/rf_export/train/labels/* datasets/parking/labels/train/
cp -R /tmp/rf_export/valid/images/* datasets/parking/images/val/
cp -R /tmp/rf_export/valid/labels/* datasets/parking/labels/val/
```

Nota:

- Roboflow usa `valid/`, el proyecto local usa `val/`.

## 6. Validar etiquetas antes de entrenar

Desde la raíz del proyecto:

```bash
source backend/.venv/bin/activate
python ai-model/scripts/validate_labels.py --dataset datasets/parking --num-classes 4
```

## 7. Entrenar

```bash
source backend/.venv/bin/activate
python ai-model/scripts/train.py \
  --data ai-model/dataset.yaml \
  --model yolov8n.pt \
  --epochs 50 \
  --imgsz 640
```

## 8. Activar inferencia en backend

Cuando termine entrenamiento, mueve el mejor peso:

```bash
cp ai-model/results/aeropark-vision-train/weights/best.pt ai-model/weights/best.pt
```

Verifica:

```txt
GET /analysis/yolo-status
```
