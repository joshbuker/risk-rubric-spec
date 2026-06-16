import secrets
import warnings
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@db:5432/risk_rubric"
    test_database_url: str = "postgresql://postgres:postgres@db:5432/risk_rubric_test"
    admin_secret: str = "change-me-in-production"
    admin_token_expire_hours: int = 8
    admin_jwt_signing_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32))

    model_config = {"env_file": ".env"}

    @model_validator(mode="after")
    def warn_insecure_defaults(self) -> "Settings":
        if self.admin_secret == "change-me-in-production":
            warnings.warn(
                "ADMIN_SECRET is set to the insecure default. "
                "Set a strong secret via the ADMIN_SECRET environment variable.",
                UserWarning,
                stacklevel=2,
            )
        return self


settings = Settings()
