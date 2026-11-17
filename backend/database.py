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
    host = os.getenv("SQL_HOST", "localhost")
    user = os.getenv("SQL_USER", os.getenv("SQL_ADMIN_USER", "postgres"))
    password = os.getenv("SQL_PASSWORD", os.getenv("SQL_ADMIN_PASSWORD", ""))
    name = os.getenv("SQL_DB_NAME", "feira_sustentavel")
    return f"postgresql+psycopg://{user}:{password}@{host}/{name}"


class Base(DeclarativeBase):
    pass


engine = create_engine(database_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
