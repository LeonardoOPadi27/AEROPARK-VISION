import argparse


def main():
    parser = argparse.ArgumentParser(description="Inferencia YOLO para AeroPark Vision")
    parser.add_argument("--weights", required=True, help="Ruta al archivo .pt")
    parser.add_argument("--source", required=True, help="Ruta a imagen o carpeta")
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--project", default="ai-model/results")
    parser.add_argument("--name", default="predict")
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except Exception as exc:
        raise SystemExit(
            "Ultralytics no está instalado. Ejecuta `pip install -r backend/requirements.txt`."
        ) from exc

    model = YOLO(args.weights)
    model.predict(
        source=args.source,
        conf=args.conf,
        imgsz=args.imgsz,
        save=True,
        project=args.project,
        name=args.name,
        verbose=True,
    )


if __name__ == "__main__":
    main()
