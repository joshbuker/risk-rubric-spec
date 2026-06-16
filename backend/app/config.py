from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/risk_rubric"
    test_database_url: str = "postgresql://postgres:postgres@localhost:5432/risk_rubric_test"

    model_config = {"env_file": ".env"}

settings = Settings()
