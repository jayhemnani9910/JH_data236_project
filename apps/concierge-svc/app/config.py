"""Configuration for the FastAPI concierge service."""

from functools import lru_cache
from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_prefix="CONCIERGE_", case_sensitive=False)

    app_name: str = "Concierge Service"
    environment: str = Field(default="development", alias="env")
    version: str = "1.0.0"

    sqlite_url: str = Field(default="sqlite+aiosqlite:///./concierge.db")
    redis_url: str = Field(default="redis://localhost:6379/0")

    kafka_bootstrap_servers: str | None = Field(default=None)
    kafka_deal_topic: str = Field(default="deal.events")
    kafka_group_id: str = Field(default="concierge-consumer")

    flights_service_url: AnyHttpUrl | str = Field(default="http://localhost:8002")
    hotels_service_url: AnyHttpUrl | str = Field(default="http://localhost:8003")
    cars_service_url: AnyHttpUrl | str = Field(default="http://localhost:8004")

    bundle_limit: int = Field(default=5, ge=1, le=10)
    websocket_ping_interval: int = Field(default=20, ge=10, le=60)
    watch_poll_interval_seconds: int = Field(default=30, ge=10)
    request_timeout_seconds: float = Field(default=5.0)

    # LLM Service configuration
    ollama_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="qwen2.5:3b")


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()


settings = get_settings()
