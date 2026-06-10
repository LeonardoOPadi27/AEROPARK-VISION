# Integración de YOLO en AeroPark Vision

Esta guía resume cómo dejar YOLO funcionando dentro del flujo actual del proyecto.

## 1. Qué hace hoy el backend

El backend ya intenta analizar automáticamente cada imagen subida:

- Si encuentra pesos YOLO y dependencias instaladas, usa YOLO.
- Si no encuentra eso, cae a análisis mock para no romper el flujo.

Endpoint útil para revisar el estado:

```txt
GET /analysis/yolo-status
```

## 2. Dónde poner el modelo

Ruta esperada por defecto:

```txt
ai-model/weights/best.pt
```

También puedes sobreescribir esa ruta con variable de entorno:

```bash
export YOLO_WEIGHTS_PATH=/ruta/completa/a/tu/best.pt
```

## 3. Instalar dependencias

Desde `backend/`:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## 4. Formato del dataset para entrenar

YOLO espera normalmente un dataset con estructura tipo:

```txt
datasets/parking/
├── images/
│   ├── train/
│   └── val/
└── labels/
    ├── train/
    └── val/
```

Cada imagen debe tener su archivo `.txt` correspondiente en `labels/`.

## 5. Archivo YAML del dataset

Ejemplo:

```yaml
path: ../datasets/parking
train: images/train
val: images/val

names:
  0: car
  1: motorcycle
  2: bus
  3: truck
```

## 6. Entrenamiento con Ultralytics

Basado en la documentación oficial de Ultralytics para `train` y `predict`, el flujo recomendado en Python es cargar un modelo con `YOLO(...)` y luego usar `model.train(...)` o `model.predict(...)`.

Ejemplo de entrenamiento:

```bash
python ai-model/scripts/train.py \
  --data /ruta/a/dataset.yaml \
  --model yolov8n.pt \
  --epochs 50 \
  --imgsz 640
```

Al terminar, normalmente el mejor peso queda en una ruta tipo:

```txt
runs/detect/train/weights/best.pt
```

Cópialo a:

```txt
ai-model/weights/best.pt
```

## 7. Probar inferencia local

```bash
python ai-model/scripts/detect.py \
  --weights ai-model/weights/best.pt \
  --source backend/uploads/tu_imagen.jpg
```

## 8. Cómo se conecta al backend

Hoy la conexión queda así:

1. Subes imagen en `/upload`
2. Backend guarda la imagen
3. Backend intenta correr YOLO
4. Si YOLO está listo, guarda análisis con estado:

```txt
completado_yolo
```

5. Si YOLO no está listo, guarda:

```txt
completado_mock
```

## 9. Qué revisar si no corre YOLO

Revisa:

- que exista `ai-model/weights/best.pt`
- que `pip install -r requirements.txt` haya instalado `ultralytics`
- que `GET /analysis/yolo-status` diga `ready: true`

## 10. Próximo paso lógico

Cuando el modelo ya detecte bien vehículos:

- reemplazar heurísticas de ocupación por espacios reales
- guardar distribución por color en DB
- mostrar detecciones reales en dashboard y analysis
