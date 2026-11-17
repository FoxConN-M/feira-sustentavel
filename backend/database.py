import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

load_dotenv()


def database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if url:
        return url.replace("postgres://", "postgresql+psycopg://", 1).replace(
            "postgresql://", "postgresql+psycopg://", 1
        )
    if os.getenv("APP_ENV", "development").lower() == "development" and not os.getenv("SQL_HOST"):
        return "sqlite:///./feira_sustentavel.db"
    host = os.getenv("SQL_HOST", "localhost")
    user = os.getenv("SQL_USER", os.getenv("SQL_ADMIN_USER", "postgres"))
    password = os.getenv("SQL_PASSWORD", os.getenv("SQL_ADMIN_PASSWORD", ""))
    name = os.getenv("SQL_DB_NAME", "feira_sustentavel")
    return f"postgresql+psycopg://{user}:{password}@{host}/{name}"


class Base(DeclarativeBase):
    pass


_database_url = database_url()
_connect_args = {"check_same_thread": False} if _database_url.startswith("sqlite") else {}
engine = create_engine(_database_url, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
