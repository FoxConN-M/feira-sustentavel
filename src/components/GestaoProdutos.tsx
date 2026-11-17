import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  PackagePlus,
  Plus,
  Search,
} from 'lucide-react';
import { Produtor, ProdutoComProdutor } from '../types.ts';
import { formatBRL, produtoFormSchema } from '../lib/validation.ts';

interface GestaoProdutosProps {
  produtores: Produtor[];
  produtos: ProdutoComProdutor[];
  isOnline: boolean;
  onCreateProduto: (input: {
    produtorId: number;
    nome: string;
    categoria: 'Agrícola' | 'Artesanato';
    unidade: 'kg' | 'un' | 'maço' | 'pote' | 'litro';
    precoUnitarioCentavos: number;
    estoqueSaldo: number;
  }) => Promise<{ ok: boolean; message: string }>;
  onAdjustStock: (
    produtoId: number,
    novoSaldo: number
  ) => Promise<{ ok: boolean; message: string }>;
}

export const GestaoProdutos: React.FC<GestaoProdutosProps> = ({
  produtores,
  produtos,
  isOnline,
  onCreateProduto,
  onAdjustStock,
}) => {
  const [produtorId, setProdutorId] = useState<number>(produtores[0]?.id || 1);
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<'Agrícola' | 'Artesanato'>('Agrícola');
  const [unidade, setUnidade] = useState<'kg' | 'un' | 'maço' | 'pote' | 'litro'>('un');
  const [precoStr, setPrecoStr] = useState('');
  const [estoqueStr, setEstoqueStr] = useState('10');
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const effectiveProdutorId =
    produtores.some((p) => p.id === produtorId) ? produtorId : produtores[0]?.id || 0;

  const filteredProdutos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return produtos.filter(
      (p) =>
        query === '' ||
        p.nome.toLowerCase().includes(query) ||
        p.produtorFamilia.toLowerCase().includes(query)
    );
  }, [produtos, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setFeedback({
        type: 'error',
        text: 'Conecte-se à internet para cadastrar novos produtos no servidor.',
      });
      return;
    }

    const precoNormalizado = Number(precoStr.replace(',', '.'));
    const estoqueNum = Number(estoqueStr);

    const parsed = produtoFormSchema.safeParse({
      produtorId: effectiveProdutorId,
      nome,
      categoria,
      unidade,
      precoReais: precoNormalizado,
      estoqueSaldo: estoqueNum,
    });

    if (!parsed.success) {
      setFeedback({
        type: 'error',
        text: parsed.error.issues[0]?.message || 'Verifique os campos do formulário.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await onCreateProduto({
        produtorId: parsed.data.produtorId,
        nome: parsed.data.nome,
        categoria: parsed.data.categoria,
        unidade: parsed.data.unidade,
        precoUnitarioCentavos: Math.round(parsed.data.precoReais * 100),
        estoqueSaldo: parsed.data.estoqueSaldo,
      });

      if (res.ok) {
        setFeedback({ type: 'success', text: res.message });
        setNome('');
        setPrecoStr('');
        setEstoqueStr('10');
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStock = async (item: ProdutoComProdutor, delta: number) => {
    if (!isOnline || updatingId !== null) return;
    const novoSaldo = Math.max(0, item.estoqueSaldo + delta);
    setUpdatingId(item.id);
    setFeedback(null);
    try {
      const res = await onAdjustStock(item.id, novoSaldo);
      if (!res.ok) {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold text-[#166534]">
          RF01 · Cadastro e Reposição de Estoque
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#14261C] sm:text-3xl">
          Produtos e Produtores
        </h1>
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#14532D]'
              : 'border-[#F5C2C0] bg-[#FEF2F2] text-[#991B1B]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#166534]" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#991B1B]" aria-hidden="true" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* New Product Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-[#DCE2D8] bg-white p-5 sm:p-6 lg:col-span-5"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-[#14261C]">
            <PackagePlus className="h-5 w-5 text-[#166534]" aria-hidden="true" />
            <span>Cadastrar Novo Produto</span>
          </div>

          <div>
            <label
              htmlFor="prod-produtor"
              className="mb-1.5 block text-xs font-semibold text-[#3D4F44]"
            >
              Família Produtora / Artesã
            </label>
            <select
              id="prod-produtor"
              value={effectiveProdutorId}
              onChange={(e) => setProdutorId(Number(e.target.value))}
              className="min-h-[48px] w-full rounded-xl border border-[#CED6CA] bg-white px-3.5 text-sm text-[#14261C]"
            >
              {produtores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.familia} — {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="prod-nome"
              className="mb-1.5 block text-xs font-semibold text-[#3D4F44]"
            >
              Nome do Produto
            </label>
            <input
              id="prod-nome"
              type="text"
              required
              maxLength={120}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Mel Silvestre 500g"
              className="min-h-[48px] w-full rounded-xl border border-[#CED6CA] bg-white px-3.5 text-sm text-[#14261C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="prod-cat"
                className="mb-1.5 block text-xs font-semibold text-[#3D4F44]"
              >
                Categoria
              </label>
              <select
                id="prod-cat"
                value={categoria}
                onChange={(e) =>
                  setCategoria(e.target.value as 'Agrícola' | 'Artesanato')
                }
                className="min-h-[48px] w-full rounded-xl border border-[#CED6CA] bg-white px-3 text-sm text-[#14261C]"
              >
                <option value="Agrícola">Agrícola</option>
                <option value="Artesanato">Artesanato</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="prod-unidade"
                className="mb-1.5 block text-xs font-semibold text-[#3D4F44]"
              >
                Unidade
              </label>
              <select
                id="prod-unidade"
                value={unidade}
                onChange={(e) =>
                  setUnidade(
                    e.target.value as 'kg' | 'un' | 'maço' | 'pote' | 'litro'
                  )
                }
                className="min-h-[48px] w-full rounded-xl border border-[#CED6CA] bg-white px-3 text-sm text-[#14261C]"
              >
                <option value="un">un (unidade)</option>
                <option value="kg">kg (quilo)</option>
                <option value="maço">maço</option>
                <option value="pote">pote</option>
                <option value="litro">litro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="prod-preco"
                className="mb-1.5 block text-xs font-semibold text-[#3D4F44]"
              >
                Preço Unitário (R$)
              </label>
              <input
                id="prod-preco"
                type="text"
                inputMode="decimal"
                required
                value={precoStr}
                onChange={(e) => setPrecoStr(e.target.value)}
                placeholder="12,50"
                className="min-h-[48px] w-full rounded-xl border border-[#CED6CA] bg-white px-3.5 text-sm text-[#14261C] tabular-nums"
              />
            </div>

            <div>
              <label
                htmlFor="prod-estoque"
                className="mb-1.5 block text-xs font-semibold text-[#3D4F44]"
              >
                Saldo Inicial
              </label>
              <input
                id="prod-estoque"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                required
                value={estoqueStr}
                onChange={(e) => setEstoqueStr(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-[#CED6CA] bg-white px-3.5 text-sm text-[#14261C] tabular-nums"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !isOnline}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#166534] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#14532D] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
          >
            <PackagePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{submitting ? 'Salvando...' : 'Salvar Produto'}</span>
          </button>
        </form>

        {/* Catalog & Quick Stock Adjustments */}
        <div className="space-y-4 rounded-2xl border border-[#DCE2D8] bg-white p-5 sm:p-6 lg:col-span-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-[#14261C]">
              Estoque Atual ({produtos.length} itens)
            </h2>
            <div className="relative sm:w-64">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6F63]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar catálogo..."
                aria-label="Filtrar catálogo de estoque"
                className="min-h-[44px] w-full rounded-xl border border-[#CED6CA] bg-white pl-10 pr-4 text-sm text-[#14261C]"
              />
            </div>
          </div>

          <div className="divide-y divide-[#ECEFE9] border-t border-[#ECEFE9]">
            {filteredProdutos.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#14261C]">{item.nome}</p>
                  <p className="text-xs text-[#5C6F63]">
                    {item.produtorFamilia} · {formatBRL(item.precoUnitarioCentavos)} /{' '}
                    {item.unidade}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span
                    className={`min-w-[84px] text-right text-sm font-bold tabular-nums ${
                      item.estoqueSaldo <= 3 ? 'text-[#9A3412]' : 'text-[#14261C]'
                    }`}
                  >
                    {item.estoqueSaldo} {item.unidade}
                  </span>

                  <button
                    type="button"
                    disabled={!isOnline || updatingId === item.id || item.estoqueSaldo === 0}
                    onClick={() => handleQuickStock(item, -1)}
                    aria-label={`Reduzir estoque de ${item.nome} em 1`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#CED6CA] bg-[#F6F7F4] text-[#14261C] hover:bg-[#E7ECE4] disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={!isOnline || updatingId === item.id}
                    onClick={() => handleQuickStock(item, 1)}
                    aria-label={`Aumentar estoque de ${item.nome} em 1`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#CED6CA] bg-[#F6F7F4] text-[#14261C] hover:bg-[#E7ECE4] disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    disabled={!isOnline || updatingId === item.id}
                    onClick={() => handleQuickStock(item, 5)}
                    aria-label={`Repor 5 unidades de ${item.nome}`}
                    className="flex h-11 items-center justify-center rounded-xl border border-[#166534] bg-[#F0F7F2] px-3 text-xs font-bold text-[#166534] hover:bg-[#DCFCE7] disabled:opacity-40 whitespace-nowrap"
                  >
                    +5
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
