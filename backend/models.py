from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    uid: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False, default="Coordenação")
    role: Mapped[str] = mapped_column(Text, nullable=False, default="coordenacao")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())


class Produtor(Base):
    __tablename__ = "produtores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    familia: Mapped[str] = mapped_column(Text, nullable=False)
    categoria: Mapped[str] = mapped_column(Text, nullable=False)
    localidade: Mapped[str] = mapped_column(Text, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())


class Produto(Base):
    __tablename__ = "produtos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    produtor_id: Mapped[int] = mapped_column(ForeignKey("produtores.id"), nullable=False)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    categoria: Mapped[str] = mapped_column(Text, nullable=False)
    unidade: Mapped[str] = mapped_column(Text, nullable=False)
    preco_unitario_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    estoque_saldo: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), onupdate=func.now()
    )


class Venda(Base):
    __tablename__ = "vendas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    produto_id: Mapped[int] = mapped_column(ForeignKey("produtos.id"), nullable=False)
    produtor_id: Mapped[int] = mapped_column(ForeignKey("produtores.id"), nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, nullable=False)
    preco_unitario_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    valor_total_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    registrado_por_uid: Mapped[str] = mapped_column(Text, nullable=False)
    client_sale_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())
