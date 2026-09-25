import uuid
from typing import Any

import boto3

from app.config import settings

_EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


def _r2_client() -> Any:
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
    )


def upload_image(file_bytes: bytes, content_type: str) -> str:
    extension = _EXTENSION_BY_CONTENT_TYPE[content_type]
    storage_key = f"products/{uuid.uuid4()}.{extension}"

    client = _r2_client()
    client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=storage_key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return storage_key


def image_url(storage_key: str) -> str:
    return f"{settings.r2_public_base_url}/{storage_key}"
