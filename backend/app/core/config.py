from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://ai_pm_user:ai_pm_password@localhost:5432/ai_pm_tool"
    test_database_url: str = "postgresql+psycopg://ai_pm_user:ai_pm_password@localhost:5432/ai_pm_tool_test"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-5"
    anthropic_workspace_id: str = ""

    frontend_origin: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
