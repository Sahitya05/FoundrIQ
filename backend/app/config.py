from __future__ import annotations

from __future__ import annotations as _

import logging
from pathlib import Path
from typing import Any, Optional

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:  # pragma: no cover
    BaseSettings = object  # type: ignore[assignment,misc]
    SettingsConfigDict = dict  # type: ignore[assignment,misc]


_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_ENV_PATH = _BACKEND_ROOT / ".env"
_ROOT_ENV_PATH = _PROJECT_ROOT / ".env"

log = logging.getLogger("foundriq.config")


class Settings(BaseSettings if BaseSettings is not object else object):
    model_config = SettingsConfigDict(
        env_file=(str(_ENV_PATH), str(_ROOT_ENV_PATH)),
        env_file_encoding="utf-8",
        extra="ignore",
    ) if not isinstance(SettingsConfigDict, dict) else {}

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    MODEL_PROVIDER: Optional[str] = None
    MODEL_NAME: str = "gpt-4o-mini"

    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None

    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_DEFAULT_REGION: Optional[str] = None
    BEDROCK_MODEL_ID: Optional[str] = None

    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    def detect_provider(self) -> Optional[str]:
        if self.MODEL_PROVIDER:
            return self.MODEL_PROVIDER.lower()
        if self.OPENAI_API_KEY:
            return "openai"
        if self.ANTHROPIC_API_KEY:
            return "anthropic"
        if self.OPENROUTER_API_KEY:
            return "openrouter"
        if self.AWS_ACCESS_KEY_ID and self.AWS_SECRET_ACCESS_KEY and self.BEDROCK_MODEL_ID:
            return "bedrock"
        return None

    def provider_ready(self) -> bool:
        provider = self.detect_provider()
        if provider is None:
            return False
        if provider == "openai":
            return bool(self.OPENAI_API_KEY)
        if provider == "anthropic":
            return bool(self.ANTHROPIC_API_KEY)
        if provider == "openrouter":
            return bool(self.OPENROUTER_API_KEY)
        if provider == "bedrock":
            return bool(
                self.AWS_ACCESS_KEY_ID
                and self.AWS_SECRET_ACCESS_KEY
                and self.AWS_DEFAULT_REGION
                and self.BEDROCK_MODEL_ID
            )
        return False

    def model_client_args(self) -> dict[str, Any]:
        provider = self.detect_provider()
        if provider == "openai":
            return {
                "api_key": self.OPENAI_API_KEY,
            }
        if provider == "openrouter":
            return {
                "api_key": self.OPENROUTER_API_KEY,
                "base_url": self.OPENROUTER_BASE_URL,
            }
        if provider == "anthropic":
            return {
                "api_key": self.ANTHROPIC_API_KEY,
            }
        if provider == "bedrock":
            return {
                "aws_access_key_id": self.AWS_ACCESS_KEY_ID,
                "aws_secret_access_key": self.AWS_SECRET_ACCESS_KEY,
                "region_name": self.AWS_DEFAULT_REGION,
            }
        return {}

    def safe_provider_summary(self) -> str:
        provider = self.detect_provider()
        ready = self.provider_ready()
        model_name = self.MODEL_NAME
        key_snippet = None
        if provider == "openai" and self.OPENAI_API_KEY:
            key_snippet = f"{self.OPENAI_API_KEY[:4]}...{self.OPENAI_API_KEY[-4:]}" if len(self.OPENAI_API_KEY) > 8 else "<set>"
        elif provider == "openrouter" and self.OPENROUTER_API_KEY:
            key_snippet = f"{self.OPENROUTER_API_KEY[:4]}...{self.OPENROUTER_API_KEY[-4:]}" if len(self.OPENROUTER_API_KEY) > 8 else "<set>"
        elif provider == "anthropic" and self.ANTHROPIC_API_KEY:
            key_snippet = f"{self.ANTHROPIC_API_KEY[:4]}...{self.ANTHROPIC_API_KEY[-4:]}" if len(self.ANTHROPIC_API_KEY) > 8 else "<set>"
        return f"provider={provider or 'none'} ready={ready} model={model_name} key={key_snippet or 'none'}"


settings = Settings()
