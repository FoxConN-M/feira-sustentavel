import os
from contextlib import asynccontextmanager
from datetime import UTC, datetime, time, timedelta
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import Produto, Produtor, Venda
from .schemas import ProdutoCreate, ProdutoUpdate, VendaCreate


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if os.getenv("APP_ENV", "development").lower() == "development":
        Base.metadata.create_all(bind=engine)
        from .seed_demo_data import seed_demo_data

        with SessionLocal() as session:
            result = seed_demo_data(session)
        print(
            f"Catálogo de teste pronto: {result['familiasCriadas']} famílias e "
            f"{result['produtosCriados']} produtos novos."
        )
    yield


app = FastAPI(title="Feira Sustentável API", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def security_headers(request: Request, call_next: Any) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "0"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Any, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    message = errors[0].get("msg", "Dados inválidos") if errors else "Dados inválidos"
    return JSONResponse(status_code=422, content={"error": message, "detail": errors})


def camel(data: dict[str, Any]) -> dict[str, Any]:
    return {
        key.split("_")[0] + "".join(part.title() for part in key.split("_")[1:]): value
        for key, value in data.items()
    }


def model_dict(record: Any, fields: list[str]) -> dict[str, Any]:
    values = {field: getattr(record, field) for field in fields}
    for key, value in values.items():
        if isinstance(value, datetime) and value.tzinfo is None:
            values[key] = value.replace(tzinfo=UTC)
    return camel(values)


def producer_product_row(product: Produto, producer: Produtor) -> dict[str, Any]:
    result = model_dict(
        product,
        [
            "id",
            "produtor_id",
            "nome",
            "categoria",
            "unidade",
            "preco_unitario_centavos",
            "estoque_saldo",
            "ativo",
            "updated_at",
        ],
    )
    result.update(
        {
            "produtorNome": producer.nome,
            "produtorFamilia": producer.familia,
            "produtorLocalidade": producer.localidade,
        }
    )
    return result


def sale_result(sale: Venda, product: Produto, synced: bool) -> dict[str, Any]:
    return {
        "venda": model_dict(
            sale,
            [
                "id",
                "produto_id",
                "produtor_id",
                "quantidade",
                "preco_unitario_centavos",
                "valor_total_centavos",
                "registrado_por_uid",
                "client_sale_id",
                "created_at",
            ],
        ),
        "produto": model_dict(
            product,
            [
                "id",
                "produtor_id",
                "nome",
                "categoria",
                "unidade",
                "preco_unitario_centavos",
                "estoque_saldo",
                "ativo",
                "updated_at",
            ],
        ),
        "alreadySynced": synced,
    }


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/vitrine")
def public_showcase(db: Session = Depends(get_db)) -> dict[str, list[dict[str, Any]]]:
    rows = db.execute(
        select(Produto, Produtor)
        .join(Produtor, Produto.produtor_id == Produtor.id)
        .where(Produto.ativo.is_(True), Produtor.ativo.is_(True))
        .order_by(Produto.categoria, Produto.nome)
    ).all()
    result = []
    for product, producer in rows:
        item = model_dict(
            product, ["id", "nome", "categoria", "unidade", "preco_unitario_centavos", "estoque_saldo"]
        )
        item.update({"produtorFamilia": producer.familia, "produtorLocalidade": producer.localidade})
        result.append(item)
    return {"produtos": result}


@app.get("/api/me")
def me() -> dict[str, str]:
    return {"uid": "mvp-local", "email": "", "name": "Coordenação", "role": "coordenacao"}


@app.get("/api/produtores")
def list_producers(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    rows = db.scalars(select(Produtor).where(Produtor.ativo.is_(True)).order_by(Produtor.id)).all()
    return {
        "produtores": [
            model_dict(row, ["id", "nome", "familia", "categoria", "localidade", "ativo"]) for row in rows
        ]
    }


@app.get("/api/produtos")
def list_products(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    rows = db.execute(
        select(Produto, Produtor)
        .join(Produtor)
        .where(Produto.ativo.is_(True), Produtor.ativo.is_(True))
        .order_by(Produto.nome)
    ).all()
    return {"produtos": [producer_product_row(product, producer) for product, producer in rows]}


@app.post("/api/produtos", status_code=201)
def create_product(
    payload: ProdutoCreate, db: Session = Depends(get_db)
) -> dict[str, Any]:
    producer = db.scalar(select(Produtor).where(Produtor.id == payload.produtor_id, Produtor.ativo.is_(True)))
    if not producer:
        raise HTTPException(status_code=404, detail="Produtor selecionado não foi encontrado.")
    product = Produto(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return {
        "produto": model_dict(
            product,
            [
                "id",
                "produtor_id",
                "nome",
                "categoria",
                "unidade",
                "preco_unitario_centavos",
                "estoque_saldo",
                "ativo",
                "updated_at",
            ],
        )
    }


@app.patch("/api/produtos/{product_id}")
def update_product(
    product_id: int,
    payload: ProdutoUpdate,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    values = payload.model_dump(exclude_unset=True)
    if not values or any(value is None for value in values.values()):
        raise HTTPException(status_code=400, detail="Informe ao menos um campo para atualização.")
    product = db.get(Produto, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    for key, value in values.items():
        setattr(product, key, value)
    product.updated_at = datetime.now(UTC).replace(tzinfo=None)
    db.commit()
    db.refresh(product)
    return {
        "produto": model_dict(
            product,
            [
                "id",
                "produtor_id",
                "nome",
                "categoria",
                "unidade",
                "preco_unitario_centavos",
                "estoque_saldo",
                "ativo",
                "updated_at",
            ],
        )
    }


@app.post("/api/vendas")
def register_sale(
    payload: VendaCreate,
    response: Response,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    existing = db.scalar(select(Venda).where(Venda.client_sale_id == payload.client_sale_id))
    if existing:
        response.status_code = 200
        return sale_result(existing, db.get(Produto, existing.produto_id), True)

    result = db.execute(
        update(Produto)
        .where(
            Produto.id == payload.produto_id,
            Produto.ativo.is_(True),
            Produto.estoque_saldo >= payload.quantidade,
        )
        .values(
            estoque_saldo=Produto.estoque_saldo - payload.quantidade,
            updated_at=datetime.now(UTC).replace(tzinfo=None),
        )
    )
    if result.rowcount == 0:
        db.rollback()
        product = db.get(Produto, payload.produto_id)
        if not product or not product.ativo:
            raise HTTPException(status_code=404, detail="Produto indisponível ou não encontrado.")
        raise HTTPException(
            status_code=409, detail=f"Estoque insuficiente. Saldo disponível: {product.estoque_saldo}."
        )
    product = db.get(Produto, payload.produto_id)
    sale = Venda(
        produto_id=product.id,
        produtor_id=product.produtor_id,
        quantidade=payload.quantidade,
        preco_unitario_centavos=product.preco_unitario_centavos,
        valor_total_centavos=product.preco_unitario_centavos * payload.quantidade,
        registrado_por_uid="mvp-local",
        client_sale_id=payload.client_sale_id,
    )
    db.add(sale)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(Venda).where(Venda.client_sale_id == payload.client_sale_id))
        if existing:
            response.status_code = 200
            return sale_result(existing, db.get(Produto, existing.produto_id), True)
        raise
    db.refresh(sale)
    response.status_code = 201
    return sale_result(sale, product, False)


@app.get("/api/vendas")
def recent_sales(
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    rows = db.execute(
        select(Venda, Produto, Produtor)
        .join(Produto)
        .join(Produtor, Venda.produtor_id == Produtor.id)
        .order_by(desc(Venda.created_at))
        .limit(30)
    ).all()
    sales = []
    for sale, product, producer in rows:
        item = model_dict(
            sale,
            [
                "id",
                "produto_id",
                "produtor_id",
                "quantidade",
                "preco_unitario_centavos",
                "valor_total_centavos",
                "client_sale_id",
                "created_at",
            ],
        )
        item.update(
            {
                "produtoNome": product.nome,
                "produtoUnidade": product.unidade,
                "produtorNome": producer.nome,
                "produtorFamilia": producer.familia,
            }
        )
        sales.append(item)
    return {"vendas": sales}


@app.get("/api/relatorios/repasses")
def report(
    periodo: str = Query(default="tudo", pattern="^(hoje|7dias|tudo)$"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    now = datetime.now(UTC)
    if periodo == "hoje":
        since = datetime.combine(now.date(), time.min)
    elif periodo == "7dias":
        since = (now - timedelta(days=7)).replace(tzinfo=None)
    else:
        since = None
    query = select(Venda, Produto).join(Produto)
    if since:
        query = query.where(Venda.created_at >= since)
    rows = db.execute(query).all()
    producers = db.scalars(select(Produtor).where(Produtor.ativo.is_(True)).order_by(Produtor.id)).all()
    aggregates: dict[int, dict[str, Any]] = {}
    for sale, product in rows:
        agg = aggregates.setdefault(
            sale.produtor_id,
            {"totalTransacoes": 0, "totalItensVendidos": 0, "valorRepasseCentavos": 0, "items": {}},
        )
        agg["totalTransacoes"] += 1
        agg["totalItensVendidos"] += sale.quantidade
        agg["valorRepasseCentavos"] += sale.valor_total_centavos
        item = agg["items"].setdefault(
            product.id,
            {
                "produtoId": product.id,
                "nome": product.nome,
                "unidade": product.unidade,
                "quantidade": 0,
                "totalCentavos": 0,
            },
        )
        item["quantidade"] += sale.quantidade
        item["totalCentavos"] += sale.valor_total_centavos
    repasses = []
    for producer in producers:
        agg = aggregates.get(producer.id, {})
        repasses.append(
            {
                "produtorId": producer.id,
                "nome": producer.nome,
                "familia": producer.familia,
                "categoria": producer.categoria,
                "localidade": producer.localidade,
                "totalTransacoes": agg.get("totalTransacoes", 0),
                "totalItensVendidos": agg.get("totalItensVendidos", 0),
                "valorRepasseCentavos": agg.get("valorRepasseCentavos", 0),
                "itensDetalhados": list(agg.get("items", {}).values()),
            }
        )
    return {
        "periodo": periodo,
        "totalGeralCentavos": sum(row["valorRepasseCentavos"] for row in repasses),
        "totalGeralTransacoes": sum(row["totalTransacoes"] for row in repasses),
        "totalGeralItens": sum(row["totalItensVendidos"] for row in repasses),
        "produtoresAtivos": len(producers),
        "repasses": repasses,
    }


@app.exception_handler(HTTPException)
async def http_error_handler(_request: Any, exc: HTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "Erro na solicitação."
    return JSONResponse(
        status_code=exc.status_code, content={"error": message, "detail": exc.detail}, headers=exc.headers
    )


dist = Path(__file__).resolve().parents[1] / "dist"
if dist.is_dir():
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa_fallback(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Rota não encontrada.")
        asset = (dist / path).resolve()
        if dist.resolve() in asset.parents and asset.is_file():
            return FileResponse(asset)
        return FileResponse(dist / "index.html")
