from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Azure Storage
    azure_storage_account: str = ""
    azure_blob_container_name: str = "ent14"
    azure_blob_endpoint_1: str = ""
    azure_blob_endpoint_2: str = ""

    # Azure Search
    azure_search_endpoint: str = ""
    azure_search_index_name: str = "ent14_index"

    # Azure OpenAI
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = "gpt-4o-2024-08-06-tpm"
    azure_openai_api_version: str = "2024-10-21"
    azure_cognitive_scope: str = "https://cognitiveservices.azure.com/.default"

    # Azure SQL
    azure_sql_server: str = ""
    azure_sql_db: str = ""
    azure_sql_connection_string: str = ""

    # Redis
    redis_endpoint: str = ""

    # Azure Identity (for SDK calls only — NOT user login)
    azure_client_id: str = ""
    azure_tenant_id: str = ""
    azure_client_secret: str = ""

    # JWT Auth
    jwt_secret_key: str = "changeme"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    # Admin bootstrap
    admin_bootstrap_email: str = "admin@tdbank.com"
    admin_bootstrap_password: str = "changeme"

    # Webhook secret
    webhook_secret: str = ""

    # Jira
    jira_base_url: str = ""
    jira_api_token: str = ""
    jira_email: str = ""

    # JTMF
    jtmf_base_url: str = ""
    jtmf_api_token: str = ""

    # Datadog
    datadog_api_key: str = ""
    datadog_app_key: str = ""

    # Splunk
    splunk_base_url: str = ""
    splunk_token: str = ""

    # Confluence
    confluence_base_url: str = ""
    confluence_api_token: str = ""
    confluence_email: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
