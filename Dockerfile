# Render runs this service on amd64. Pinning the build architecture also avoids
# pulling the much larger ARM/CUDA dependency set when building on Apple Silicon.
FROM --platform=linux/amd64 python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip \
    && pip install --index-url https://download.pytorch.org/whl/cpu \
        torch==2.5.1+cpu torchvision==0.20.1+cpu \
    && pip install -r /app/backend/requirements.txt

COPY backend /app/backend
COPY ai-model/config /app/ai-model/config
# The trained model is small enough to ship with the service image. This keeps
# inference available even when object-storage public URLs are unavailable.
COPY ai-model/weights/best.pt /app/ai-model/weights/best.pt

WORKDIR /app/backend
RUN mkdir -p /app/backend/uploads /app/backend/data

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && if [ \"${RUN_PRODUCTION_SEED:-false}\" = \"true\" ]; then python scripts/seed_db.py; fi && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
