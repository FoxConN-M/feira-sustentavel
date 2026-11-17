from collections.abc import Generator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.main import app
from backend.models import Produto, Produtor

pytestmark = pytest.mark.anyio


@pytest.fixture()
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture()
async def client(anyio_backend: str) -> Generator[AsyncClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    test_session = sessionmaker(bind=engine, expire_on_commit=False)

    def override_db() -> Generator[Session, None, None]:
        session = test_session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    with test_session() as session:
        producer = Produtor(nome="Ana", familia="Família Oliveira", categoria="Agrícola", localidade="Centro")
        session.add(producer)
        session.flush()
        session.add(
            Produto(
                produtor_id=producer.id,
                nome="Tomate",
                categoria="Agrícola",
                unidade="kg",
                preco_unitario_centavos=850,
                estoque_saldo=5,
                ativo=True,
            )
        )
        session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


async def test_health_and_public_showcase(client: AsyncClient) -> None:
    assert (await client.get("/api/health")).json() == {"ok": True}
    response = await client.get("/api/vitrine")
    assert response.status_code == 200
    assert response.json()["produtos"][0]["produtorFamilia"] == "Família Oliveira"


async def test_sale_deducts_stock_and_retry_is_idempotent(client: AsyncClient) -> None:
    payload = {"produtoId": 1, "quantidade": 2, "clientSaleId": "offline-sale-0001"}
    first = await client.post("/api/vendas", json=payload)
    assert first.status_code == 201
    assert first.json()["produto"]["estoqueSaldo"] == 3

    retry = await client.post("/api/vendas", json=payload)
    assert retry.status_code == 200
    assert retry.json()["alreadySynced"] is True
    assert retry.json()["produto"]["estoqueSaldo"] == 3


async def test_sale_rejects_quantity_above_available_stock(client: AsyncClient) -> None:
    response = await client.post(
        "/api/vendas", json={"produtoId": 1, "quantidade": 6, "clientSaleId": "offline-sale-0002"}
    )
    assert response.status_code == 409
    assert "Estoque insuficiente" in response.json()["error"]


async def test_report_aggregates_confirmed_sales(client: AsyncClient) -> None:
    await client.post(
        "/api/vendas", json={"produtoId": 1, "quantidade": 2, "clientSaleId": "offline-sale-0003"}
    )
    response = await client.get("/api/relatorios/repasses?periodo=tudo")
    assert response.status_code == 200
    report = response.json()
    assert report["totalGeralCentavos"] == 1700
    assert report["totalGeralTransacoes"] == 1
    assert report["repasses"][0]["itensDetalhados"][0]["quantidade"] == 2


async def test_report_rejects_unsupported_period(client: AsyncClient) -> None:
    response = await client.get("/api/relatorios/repasses?periodo=30dias")
    assert response.status_code == 422
    assert "error" in response.json()


async def test_mvp_panel_routes_do_not_require_authentication(client: AsyncClient) -> None:
    coordinator = await client.get("/api/me")
    producers = await client.get("/api/produtores")
    report = await client.get("/api/relatorios/repasses")
    assert coordinator.status_code == 200
    assert coordinator.json()["uid"] == "mvp-local"
    assert producers.status_code == 200
    assert report.status_code == 200
