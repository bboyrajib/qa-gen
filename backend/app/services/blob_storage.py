from azure.identity import ClientSecretCredential
from azure.storage.blob.aio import BlobServiceClient
from app.core.config import settings
import io


def _credential() -> ClientSecretCredential:
    return ClientSecretCredential(
        tenant_id=settings.azure_tenant_id,
        client_id=settings.azure_client_id,
        client_secret=settings.azure_client_secret,
    )


def _service_client() -> BlobServiceClient:
    return BlobServiceClient(
        account_url=settings.azure_blob_endpoint_1,
        credential=_credential(),
    )


async def upload_text(blob_name: str, content: str, content_type: str = "text/plain") -> str:
    async with _service_client() as svc:
        container = svc.get_container_client(settings.azure_blob_container_name)
        blob = container.get_blob_client(blob_name)
        await blob.upload_blob(content.encode("utf-8"), overwrite=True, content_settings={"content_type": content_type})
    return blob_name


async def upload_bytes(blob_name: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    async with _service_client() as svc:
        container = svc.get_container_client(settings.azure_blob_container_name)
        blob = container.get_blob_client(blob_name)
        await blob.upload_blob(data, overwrite=True, content_settings={"content_type": content_type})
    return blob_name


async def download_text(blob_name: str) -> str:
    async with _service_client() as svc:
        container = svc.get_container_client(settings.azure_blob_container_name)
        blob = container.get_blob_client(blob_name)
        stream = await blob.download_blob()
        return (await stream.readall()).decode("utf-8")
