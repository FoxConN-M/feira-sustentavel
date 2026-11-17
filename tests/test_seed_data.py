from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from backend.database import Base
from backend.models import Produto, Produtor
from backend.seed_demo_data import seed_demo_data


def test_demo_catalog_has_15_families_and_45_products_and_is_idempotent() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)

    with Session(engine) as session:
        first_run = seed_demo_data(session)
        assert first_run == {"familiasCriadas": 15, "produtosCriados": 45}
        assert session.scalar(select(func.count()).select_from(Produtor)) == 15
        assert session.scalar(select(func.count()).select_from(Produto)) == 45

        second_run = seed_demo_data(session)
        assert second_run == {"familiasCriadas": 0, "produtosCriados": 0}
        assert session.scalar(select(func.count()).select_from(Produtor)) == 15
        assert session.scalar(select(func.count()).select_from(Produto)) == 45

    Base.metadata.drop_all(bind=engine)
    engine.dispose()
