import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Minus,
  Plus,
  Search,
  ShoppingBag,
} from 'lucide-react';
import {
  OfflineSaleItem,
  Produtor,
  ProdutoComProdutor,
  VendaRecente,
} from '../types.ts';
import { formatBRL, formatDateTimeBR, vendaFormSchema } from '../lib/validation.ts';

interface RegistroVendaProps {
  isOnline: boolean;
  produtores: Produtor[];
  produtos: ProdutoComProdutor[];
  vendasRecentes: VendaRecente[];
  pendingSales: OfflineSaleItem[];
  onRegisterSale: (input: {
    produto: ProdutoComProdutor;
    quantidade: number;
  }) => Promise<{ ok: boolean; offlineQueued: boolean; message: string }>;
}

export const RegistroVenda: React.FC<RegistroVendaProps> = ({
  isOnline,
  produtores,
  produtos,
  vendasRecentes,
  pendingSales,
  onRegisterSale,
}) => {
  const [selectedProdutorId, setSelectedProdutorId] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(null);
  const [quantidadeStr, setQuantidadeStr] = useState<string>('1');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'offline' | 'error';
    text: string;
  } | null>(null);

  const filteredProdutos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return produtos.filter((p) => {
      const matchesProdutor =
        selectedProdutorId === 0 || p.produtorId === selectedProdutorId;
      const matchesQuery =
        query === '' ||
        p.nome.toLowerCase().includes(query) ||
        p.produtorFamilia.toLowerCase().includes(query) ||
        p.produtorNome.toLowerCase().includes(query);
      return matchesProdutor && matchesQuery;
    });
  }, [produtos, selectedProdutorId, searchTerm]);

  const selectedProduto = useMemo(
    () => produtos.find((p) => p.id === selectedProdutoId) || null,
    [produtos, selectedProdutoId]
  );

  useEffect(() => {
    if (
      selectedProdutoId === null &&
      filteredProdutos.length > 0
    ) {
      const firstInStock =
        filteredProdutos.find((p) => p.estoqueSaldo > 0) || filteredProdutos[0];
      setSelectedProdutoId(firstInStock.id);
    }
  }, [filteredProdutos, selectedProdutoId]);

  const parsedQuantidade = Number(quantidadeStr);
  const validationResult = useMemo(() => {
    if (!selectedProduto) {
      return { valid: false, error: 'Selecione um produto na lista ao lado.' };
    }
    if (!Number.isInteger(parsedQuantidade)) {
      return { valid: false, error: 'Informe um número inteiro positivo.' };
    }
    const schema = vendaFormSchema(selectedProduto.estoqueSaldo);
    const parsed = schema.safeParse({
      produtoId: selectedProduto.id,
      quantidade: parsedQuantidade,
    });
    if (!parsed.success) {
      return {
        valid: false,
        error: parsed.error.issues[0]?.message || 'Quantidade inválida.',
      };
    }
    return { valid: true, error: null };
  }, [selectedProduto, parsedQuantidade]);

  const valorTotalCentavos = useMemo(() => {
    if (!selectedProduto || !Number.isFinite(parsedQuantidade) || parsedQuantidade <= 0) {
      return 0;
    }
    return selectedProduto.precoUnitarioCentavos * Math.floor(parsedQuantidade);
  }, [selectedProduto, parsedQuantidade]);

  const handleStep = (delta: number) => {
    const current = Number.isInteger(parsedQuantidade) ? parsedQuantidade : 1;
    const maxAllowed = selectedProduto ? Math.max(1, selectedProduto.estoqueSaldo) : 99;
    const next = Math.min(maxAllowed, Math.max(1, current + delta));
    setQuantidadeStr(String(next));
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduto || !validationResult.valid || submitting) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await onRegisterSale({
        produto: selectedProduto,
        quantidade: parsedQuantidade,
      });
      if (res.ok) {
        setFeedback({
          type: res.offlineQueued ? 'offline' : 'success',
          text: res.message,
        });
        setQuantidadeStr('1');
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#166534]">
            Operação de Caixa · Baixa Automática de Estoque
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#14261C] sm:text-3xl">
            Registrar Nova Venda
          </h1>
        </div>
        <p className="text-sm text-[#4A5D52]">
          Selecione o produto, ajuste a quantidade e confirme o lançamento.
        </p>
        <span
          role="status"
          className={`inline-flex min-h-[48px] items-center gap-2 self-start rounded-full px-4 text-sm font-bold ${
            isOnline ? 'bg-[#E8F5E9] text-[#14532D]' : 'bg-[#FEF7EC] text-[#7C2D12]'
          }`}
        >
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-[#166534]' : 'bg-[#B45309]'}`} />
          {isOnline ? 'Online · sincronizado' : 'Offline · vendas salvas neste dispositivo'}
        </span>
      </div>

      {/* Feedback Banner (Screen 3 Alert) */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#14532D]'
              : feedback.type === 'offline'
              ? 'border-[#F3D9B1] bg-[#FEF7EC] text-[#7C2D12]'
              : 'border-[#F5C2C0] bg-[#FEF2F2] text-[#991B1B]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#166534]" aria-hidden="true" />
          ) : feedback.type === 'offline' ? (
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#991B1B]" aria-hidden="true" />
          )}
          <div>
            <p className="font-semibold">{feedback.text}</p>
          </div>
        </div>
      )}

      {/* Main 12-col Split: Product Selector (7) + Checkout Form (5) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Product Selection Column */}
        <div className="space-y-4 rounded-2xl border border-[#DCE2D8] bg-white p-5 sm:p-6 lg:col-span-7">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="filtro-produtor-venda"
                className="mb-1.5 block text-xs font-semibold text-[#3D4F44]"
              >
                Filtrar por produtor
              </label>
              <select
                id="filtro-produtor-venda"
                value={selectedProdutorId}
                onChange={(e) => setSelectedProdutorId(Number(e.target.value))}
                className="min-h-[48px] w-full rounded-xl border border-[#CED6CA] bg-white px-3.5 text-sm font-medium text-[#14261C]"
              >
                <option value={0}>Todas as 15 famílias produtoras</option>
                {produtores.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.familia} ({prod.nome})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="busca-produto-venda"
                className="mb-1.5 block text-xs font-semibold text-[#3D4F44]"
              >
                Buscar item
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6F63]"
                  aria-hidden="true"
                />
                <input
                  id="busca-produto-venda"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex.: Tomate, Mel, Cesto..."
                  className="min-h-[48px] w-full rounded-xl border border-[#CED6CA] bg-white pl-10 pr-4 text-sm text-[#14261C]"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#ECEFE9] border-t border-[#ECEFE9]">
            {filteredProdutos.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#5C6F63]">
                Nenhum produto encontrado para os filtros informados.
              </p>
            ) : (
              filteredProdutos.map((item) => {
                const isSelected = item.id === selectedProdutoId;
                const semEstoque = item.estoqueSaldo <= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedProdutoId(item.id);
                      setQuantidadeStr('1');
                      setFeedback(null);
                    }}
                    className={`flex min-h-[68px] w-full items-center justify-between gap-4 px-3 py-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-[#EEF6F0] ring-2 ring-inset ring-[#166534]'
                        : 'hover:bg-[#F8FAF7]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold text-[#14261C]">
                        {item.nome}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#5C6F63]">
                        {item.produtorFamilia} · {item.categoria} · {item.unidade}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold text-[#166534] tabular-nums">
                        {formatBRL(item.precoUnitarioCentavos)}
                      </p>
                      <p
                        className={`mt-0.5 text-xs font-semibold tabular-nums ${
                          semEstoque ? 'text-[#9A3412]' : 'text-[#3D4F44]'
                        }`}
                      >
                        {semEstoque
                          ? 'Sem estoque'
                          : `Saldo: ${item.estoqueSaldo} ${item.unidade}`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Sticky Checkout Panel */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#DCE2D8] bg-white p-5 sm:p-6 lg:sticky lg:top-20 lg:col-span-5"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-[#166534]">
            <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Resumo do Lançamento</span>
          </div>

          {selectedProduto ? (
            <div className="mt-3 space-y-5">
              <div className="border-b border-[#ECEFE9] pb-4">
                <h2 className="text-xl font-bold text-[#14261C]">
                  {selectedProduto.nome}
                </h2>
                <p className="mt-1 text-sm text-[#4A5D52]">
                  {selectedProduto.produtorFamilia} ({selectedProduto.produtorNome})
                </p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-[#5C6F63]">
                    Preço unitário ({selectedProduto.unidade})
                  </span>
                  <span className="font-bold text-[#14261C] tabular-nums">
                    {formatBRL(selectedProduto.precoUnitarioCentavos)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-[#5C6F63]">Saldo disponível</span>
                  <span
                    className={`font-bold tabular-nums ${
                      selectedProduto.estoqueSaldo > 0
                        ? 'text-[#166534]'
                        : 'text-[#9A3412]'
                    }`}
                  >
                    {selectedProduto.estoqueSaldo} {selectedProduto.unidade}
                  </span>
                </div>
              </div>

              {/* Quantity Stepper (>= 48x48px touch targets) */}
              <div>
                <label
                  htmlFor="quantidade-venda"
                  className="mb-2 block text-sm font-semibold text-[#14261C]"
                >
                  Quantidade ({selectedProduto.unidade})
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleStep(-1)}
                    disabled={parsedQuantidade <= 1}
                aria-label="Diminuir quantidade"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#CED6CA] bg-[#F6F7F4] text-[#14261C] transition-colors hover:bg-[#E7ECE4] disabled:opacity-40"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <input
                    id="quantidade-venda"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={Math.max(1, selectedProduto.estoqueSaldo)}
                    step={1}
                    value={quantidadeStr}
                    onChange={(e) => {
                      setQuantidadeStr(e.target.value);
                      setFeedback(null);
                    }}
                    className="min-h-[48px] w-full rounded-xl border border-[#CED6CA] bg-white px-4 text-center text-xl font-bold text-[#14261C] tabular-nums"
                  />

                  <button
                    type="button"
                    onClick={() => handleStep(1)}
                    disabled={
                      selectedProduto.estoqueSaldo <= 0 ||
                      parsedQuantidade >= selectedProduto.estoqueSaldo
                    }
                    aria-label="Aumentar quantidade"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#CED6CA] bg-[#F6F7F4] text-[#14261C] transition-colors hover:bg-[#E7ECE4] disabled:opacity-40"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {!validationResult.valid && validationResult.error && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#9A3412]">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{validationResult.error}</span>
                  </p>
                )}
              </div>

              <div className="flex items-baseline justify-between rounded-xl bg-[#F6F7F4] px-4 py-3.5">
                <span className="text-sm font-semibold text-[#3D4F44]">
                  Total da venda
                </span>
                <span className="text-2xl font-bold text-[#166534] tabular-nums">
                  {formatBRL(valorTotalCentavos)}
                </span>
              </div>

              <button
                type="submit"
                disabled={!validationResult.valid || submitting}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#166534] px-6 py-3 text-base font-bold text-white transition-colors hover:bg-[#14532D] disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{submitting ? 'Registrando...' : 'Confirmar Venda e Atualizar Estoque'}</span>
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#5C6F63]">
              Selecione um produto na lista para iniciar o registro de venda.
            </p>
          )}
        </form>
      </div>

      {/* Pending Offline Queue + Recent Sales History */}
      <section className="rounded-2xl border border-[#DCE2D8] bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-[#14261C]">
          Vendas Recentes
        </h2>

        {pendingSales.length === 0 && vendasRecentes.length === 0 ? (
          <p className="mt-3 text-sm text-[#5C6F63]">
            Nenhuma venda registrada até o momento.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-[#ECEFE9]">
            {pendingSales.map((p) => (
              <div
                key={p.clientSaleId}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-bold text-[#14261C]">{p.produtoNome}</p>
                  <p className="text-xs text-[#7C2D12]">
                    {p.produtorFamilia} · {p.quantidade} {p.unidade} · Pendente de
                    sincronização offline
                  </p>
                </div>
                <span className="font-bold text-[#9A3412] tabular-nums">
                  {formatBRL(p.valorTotalCentavos)}
                </span>
              </div>
            ))}

            {vendasRecentes.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-bold text-[#14261C]">{v.produtoNome}</p>
                  <p className="text-xs text-[#5C6F63]">
                    {v.produtorFamilia} · {v.quantidade} {v.produtoUnidade} ·{' '}
                    {formatDateTimeBR(v.createdAt)}
                  </p>
                </div>
                <span className="font-bold text-[#166534] tabular-nums">
                  {formatBRL(v.valorTotalCentavos)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
