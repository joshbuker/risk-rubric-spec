from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@db:5432/risk_rubric"
    test_database_url: str = "postgresql://postgres:postgres@db:5432/risk_rubric_test"
    admin_secret: str = "change-me-in-production"
    admin_token_expire_hours: int = 8

    model_config = {"env_file": ".env"}

settings = Settings()
