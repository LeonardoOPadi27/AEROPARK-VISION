import argparse


def main():
    parser = argparse.ArgumentParser(description="Entrenar modelo YOLO para AeroPark Vision")
    parser.add_argument("--data", required=True, help="Ruta al dataset YAML")
    parser.add_argument("--model", default="yolov8n.pt", help="Modelo base o checkpoint")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=8)
    parser.add_argument("--project", default="ai-model/results")
    parser.add_argument("--name", default="aeropark-vision-train")
    parser.add_argument("--device", default=None, help="cpu, 0, 0,1, etc.")
    args = parser.parse_args()

    try:
        from ultralytics import YOLO
    except Exception as exc:
        raise SystemExit(
            "Ultralytics no está instalado. Ejecuta `pip install -r backend/requirements.txt`."
        ) from exc

    model = YOLO(args.model)
    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        project=args.project,
        name=args.name,
        device=args.device,
    )


if __name__ == "__main__":
    main()
