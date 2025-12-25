from pydantic_settings import BaseSettings
from typing import Optional, List
import os


class Settings(BaseSettings):
    # Application Settings
    app_env: str = "development"
    app_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    # PostgreSQL Database
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "cxoninja_user"
    postgres_password: str = "your_secure_password"
    postgres_db: str = "cxoninja_users"

    # MongoDB Database
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db: str = "cxoninja_documents"
    mongo_user: Optional[str] = None
    mongo_password: Optional[str] = None

    # JWT Settings
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # OpenAI (can be overridden via admin settings stored in DB)
    openai_api_key: Optional[str] = None
    default_ai_model: str = "gpt-4o-mini"

    # Backend Settings
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    
    # Default Admin User
    default_admin_email: str = "admin@cxo.ninja"
    default_admin_username: str = "admin"
    default_admin_password: str = "admin123"
    
    # Logging
    log_level: str = "INFO"
    
    # Security
    force_https: bool = False
    rate_limit_per_minute: int = 60
    
    # File Uploads
    max_file_size_mb: int = 10
    allowed_extensions: str = ".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.pptx,.ppt"

    @property
    def postgres_url(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def async_postgres_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_extensions_list(self) -> List[str]:
        """Parse comma-separated extensions into a list."""
        return [ext.strip() for ext in self.allowed_extensions.split(",") if ext.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
