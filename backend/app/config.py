from pydantic_settings import BaseSettings
from typing import List, Union
import json
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres.dcujimoqieonrzpptpoo:CSBSPR%402027@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
    SECRET_KEY: str = "supabase-placement-tracker-v2-super-secret-key-2027"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    INITIAL_ADMIN_EMAIL: str = "admin@placement.edu"
    INITIAL_ADMIN_PASSWORD: str = "Admin@2027"
    INITIAL_ADMIN_NAME: str = "Head of Placement"
    CORS_ORIGINS: Union[List[str], str] = ["*"]

    class Config:
        env_file = ".env"
        extra = "allow"

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        try:
            return json.loads(self.CORS_ORIGINS)
        except Exception:
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

settings = Settings()
