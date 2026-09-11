import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
STORAGE_PROVIDER = os.getenv("OBJECT_STORAGE_PROVIDER", "local").strip().lower()
S3_BUCKET = os.getenv("S3_BUCKET", "").strip()
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "").strip() or None
S3_REGION = os.getenv("S3_REGION", "auto").strip()
S3_PUBLIC_BASE_URL = os.getenv("S3_PUBLIC_BASE_URL", "").strip().rstrip("/")


def object_storage_enabled() -> bool:
    return STORAGE_PROVIDER in {"s3", "r2"}


def _require_s3_configuration() -> None:
    required = {
        "S3_BUCKET": S3_BUCKET,
        "S3_ACCESS_KEY_ID": os.getenv("S3_ACCESS_KEY_ID", "").strip(),
        "S3_SECRET_ACCESS_KEY": os.getenv("S3_SECRET_ACCESS_KEY", "").strip(),
        "S3_PUBLIC_BASE_URL": S3_PUBLIC_BASE_URL,
    }
    missing = [name for name, value in required.items() if not value]
    if missing:
        raise RuntimeError(
            "Faltan variables de almacenamiento externo: " + ", ".join(missing)
        )


def _s3_client():
    _require_s3_configuration()
    try:
        import boto3
    except ImportError as exc:
        raise RuntimeError(
            "El almacenamiento externo requiere la dependencia boto3."
        ) from exc

    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT_URL,
        region_name=S3_REGION,
        aws_access_key_id=os.getenv("S3_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("S3_SECRET_ACCESS_KEY"),
    )


def upload_file(path: Path, object_key: str, content_type: str) -> str:
    if not object_storage_enabled():
        return f"/uploads/{path.name}"

    client = _s3_client()
    with path.open("rb") as file_handle:
        client.put_object(
            Bucket=S3_BUCKET,
            Key=object_key,
            Body=file_handle,
            ContentType=content_type,
        )
    return f"{S3_PUBLIC_BASE_URL}/{object_key}"


def delete_file(object_key: str) -> None:
    if object_storage_enabled():
        _s3_client().delete_object(Bucket=S3_BUCKET, Key=object_key)
