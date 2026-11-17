"""Create tables for a new database. Existing deployments keep their schema."""

from . import models  # noqa: F401
from .database import Base, engine

Base.metadata.create_all(bind=engine)
print("Schema ready.")
