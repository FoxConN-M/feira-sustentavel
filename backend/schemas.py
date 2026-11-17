from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=lambda s: s.split("_")[0] + "".join(part.title() for part in s.split("_")[1:]),
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class ProdutoCreate(CamelModel):
    produtor_id: int = Field(gt=0)
    nome: str = Field(min_length=2, max_length=120)
    categoria: Literal["Agrícola", "Artesanato"]
    unidade: Literal["kg", "un", "maço", "pote", "litro"]
    preco_unitario_centavos: int = Field(ge=50, le=1_000_000)
    estoque_saldo: int = Field(ge=0, le=100_000)


class ProdutoUpdate(CamelModel):
    preco_unitario_centavos: int | None = Field(default=None, ge=50, le=1_000_000)
    estoque_saldo: int | None = Field(default=None, ge=0, le=100_000)
    ativo: bool | None = None


class VendaCreate(CamelModel):
    produto_id: int = Field(gt=0)
    quantidade: int = Field(ge=1, le=500)
    client_sale_id: str = Field(min_length=8, max_length=80)
