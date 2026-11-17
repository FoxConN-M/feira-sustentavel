"""Idempotent demo catalog for local MVP testing."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Produto, Produtor

DEMO_FAMILIES = [
    {
        "familia": "Família de teste 01 · Sítio Verde",
        "produtos": [
            ("Alface crespa", "maço", 700, 16),
            ("Couve-manteiga", "maço", 650, 14),
            ("Coentro", "maço", 350, 20),
        ],
    },
    {
        "familia": "Família de teste 02 · Raízes do Vale",
        "produtos": [
            ("Batata-doce", "kg", 550, 30),
            ("Mandioca", "kg", 600, 25),
            ("Inhame", "kg", 800, 20),
        ],
    },
    {
        "familia": "Família de teste 03 · Horta Boa Terra",
        "produtos": [
            ("Tomate", "kg", 890, 25),
            ("Pimentão verde", "kg", 1000, 12),
            ("Pepino", "kg", 600, 16),
        ],
    },
    {
        "familia": "Família de teste 04 · Horta das Águas",
        "produtos": [
            ("Abóbora", "kg", 450, 20),
            ("Chuchu", "kg", 500, 18),
            ("Maxixe", "kg", 700, 14),
        ],
    },
    {
        "familia": "Família de teste 05 · Sementes do Sol",
        "produtos": [
            ("Cenoura", "kg", 700, 20),
            ("Beterraba", "kg", 700, 18),
            ("Rabanete", "maço", 550, 12),
        ],
    },
    {
        "familia": "Família de teste 06 · Horta Esperança",
        "produtos": [
            ("Quiabo", "kg", 1000, 15),
            ("Jiló", "kg", 850, 12),
            ("Berinjela", "kg", 800, 14),
        ],
    },
    {
        "familia": "Família de teste 07 · Recanto das Folhas",
        "produtos": [
            ("Rúcula", "maço", 600, 12),
            ("Mostarda", "maço", 600, 10),
            ("Cebolinha", "maço", 300, 18),
        ],
    },
    {
        "familia": "Família de teste 08 · Lagoa Grande",
        "produtos": [
            ("Feijão verde", "kg", 1200, 16),
            ("Feijão-de-corda verde", "kg", 1100, 18),
            ("Milho verde", "un", 300, 30),
        ],
    },
    {
        "familia": "Família de teste 09 · Horta do Campo",
        "produtos": [
            ("Cebola", "kg", 850, 22),
            ("Alho", "un", 200, 40),
            ("Batata inglesa", "kg", 700, 24),
        ],
    },
    {
        "familia": "Família de teste 10 · Serra Azul",
        "produtos": [
            ("Couve-flor", "un", 1200, 8),
            ("Repolho", "un", 800, 12),
            ("Brócolis", "maço", 1000, 10),
        ],
    },
    {
        "familia": "Família de teste 11 · Vida na Roça",
        "produtos": [
            ("Vagem", "kg", 1200, 12),
            ("Ervilha-torta", "kg", 1400, 10),
            ("Pimentão vermelho", "kg", 1400, 9),
        ],
    },
    {
        "familia": "Família de teste 12 · Novo Horizonte",
        "produtos": [
            ("Tomate-cereja", "kg", 1500, 10),
            ("Abobrinha", "kg", 800, 16),
            ("Pimenta-de-cheiro", "kg", 1200, 8),
        ],
    },
    {
        "familia": "Família de teste 13 · Horta da Mata",
        "produtos": [
            ("Alface americana", "maço", 800, 12),
            ("Acelga", "un", 900, 8),
            ("Chicória", "maço", 600, 10),
        ],
    },
    {
        "familia": "Família de teste 14 · Riacho Doce",
        "produtos": [
            ("Cará", "kg", 900, 16),
            ("Gengibre", "kg", 1600, 7),
            ("Cúrcuma fresca", "kg", 1800, 6),
        ],
    },
    {
        "familia": "Família de teste 15 · Santa Luzia",
        "produtos": [
            ("Feijão-guandu verde", "kg", 1000, 14),
            ("Amendoim verde", "kg", 1400, 12),
            ("Quiabo miúdo", "kg", 1100, 10),
        ],
    },
]


def seed_demo_data(db: Session) -> dict[str, int]:
    producers_added = 0
    products_added = 0

    for index, family_data in enumerate(DEMO_FAMILIES, start=1):
        family = family_data["familia"]
        producer = db.scalar(select(Produtor).where(Produtor.familia == family))
        if producer is None:
            producer = Produtor(
                nome=f"Produtor de teste {index:02d}",
                familia=family,
                categoria="Agrícola",
                localidade="Comunidade de teste",
                ativo=True,
            )
            db.add(producer)
            db.flush()
            producers_added += 1

        for product_name, unit, price_cents, stock in family_data["produtos"]:
            existing_product = db.scalar(
                select(Produto).where(
                    Produto.produtor_id == producer.id,
                    Produto.nome == product_name,
                )
            )
            if existing_product is not None:
                continue
            db.add(
                Produto(
                    produtor_id=producer.id,
                    nome=product_name,
                    categoria="Agrícola",
                    unidade=unit,
                    preco_unitario_centavos=price_cents,
                    estoque_saldo=stock,
                    ativo=True,
                )
            )
            products_added += 1

    db.commit()
    return {"familiasCriadas": producers_added, "produtosCriados": products_added}


def main() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        result = seed_demo_data(db)
    print(
        f"Dados de demonstração prontos: {result['familiasCriadas']} famílias e "
        f"{result['produtosCriados']} produtos adicionados."
    )


if __name__ == "__main__":
    main()
