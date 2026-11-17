import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Search,
  Sprout,
  Store,
  AlertCircle,
} from 'lucide-react';
import { AppTab, CoordinatorUser, ProdutoVitrine } from '../types.ts';
import { formatBRL } from '../lib/validation.ts';

interface VitrinePublicaProps {
  produtos: ProdutoVitrine[];
  loading: boolean;
  error: string | null;
  coordinator: CoordinatorUser | null;
  onEnterPanel: () => void;
  onNavigate: (tab: AppTab) => void;
  onRetry: () => void;
}

export const VitrinePublica: React.FC<VitrinePublicaProps> = ({
  produtos,
  loading,
  error,
  coordinator,
  onEnterPanel,
  onNavigate,
  onRetry,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | 'Agrícola' | 'Artesanato'>(
    'Todos'
  );

  const filteredProdutos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return produtos.filter((item) => {
      const matchesCategory =
        categoryFilter === 'Todos' || item.categoria === categoryFilter;
      const matchesQuery =
        query === '' ||
        item.nome.toLowerCase().includes(query) ||
        item.produtorFamilia.toLowerCase().includes(query) ||
        item.produtorLocalidade.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [produtos, searchTerm, categoryFilter]);

  const disponiveisCount = useMemo(
    () => produtos.filter((p) => p.estoqueSaldo > 0).length,
    [produtos]
  );

  return (
    <div className="space-y-8">
      {/* Entry Hero & Coordinator Access Split */}
      <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-2xl border border-[#DCE2D8] bg-white p-6 sm:p-8 lg:col-span-7">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#166534]">
              Associação de Produtores e Artesãos · ODS 8
            </p>
            <h1 className="mt-2 text-2xl font-bold leading-tight text-[#14261C] sm:text-4xl [text-wrap:balance]">
              Feira Sustentável: produção familiar direta, transparente e acessível.
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[#3D4F44]">
              Consulte na vitrine abaixo os alimentos agroecológicos e peças artesanais das
              15 famílias associadas em tempo real. Nenhum dado pessoal de consumidores é
              coletado.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-[#ECEFE9] pt-5 text-sm text-[#3D4F44]">
            <div>
              <span className="block text-xs text-[#5C6F63]">Famílias associadas</span>
              <span className="text-xl font-bold text-[#14261C] tabular-nums">15</span>
            </div>
            <div className="h-8 w-px bg-[#E2E6DF]" aria-hidden="true" />
            <div>
              <span className="block text-xs text-[#5C6F63]">Itens disponíveis hoje</span>
              <span className="text-xl font-bold text-[#166534] tabular-nums">
                {disponiveisCount}
              </span>
            </div>
            <div className="h-8 w-px bg-[#E2E6DF]" aria-hidden="true" />
            <div>
              <span className="block text-xs text-[#5C6F63]">Privacidade LGPD</span>
              <span className="text-sm font-semibold text-[#14261C]">
                Zero dados de clientes
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-[#DCE2D8] bg-[#EEF4EE] p-6 sm:p-8 lg:col-span-5">
          {coordinator ? (
            <>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#166534]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Sessão da Coordenação ativa</span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-[#14261C]">
                  Olá, {coordinator.name}
                </h2>
                {coordinator.email && <p className="mt-1 text-sm text-[#3D4F44]">{coordinator.email}</p>}
                <p className="mt-3 text-sm text-[#3D4F44]">
                  Acesse o ponto de venda rápido, cadastre novos lotes ou gere o relatório
                  de repasses financeiros para as famílias.
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onNavigate('vendas')}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#166534] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#14532D] whitespace-nowrap"
                >
                  <span>Registrar Venda</span>
                  <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('repasses')}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#BFCBBC] bg-white px-4 py-2.5 text-sm font-semibold text-[#14261C] transition-colors hover:bg-[#F6F7F4] whitespace-nowrap"
                >
                  <span>Ver Repasses</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#166534]">
                  <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Acesso Restrito à Coordenação</span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-[#14261C]">
                  Painel Operacional da Feira
                </h2>
                <p className="mt-2 text-sm text-[#3D4F44]">
                  Acesse o painel operacional para registrar vendas com baixa automática
                  no estoque e consultar os repasses das famílias.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={onEnterPanel}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#166534] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#14532D] disabled:opacity-60"
                >
                  <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Entrar como Coordenação</span>
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* RF04: Public Read-Only Showcase */}
      <section aria-labelledby="vitrine-heading" className="space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#166534]">
              <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Vitrine Digital Pública · Somente Leitura</span>
            </div>
            <h2 id="vitrine-heading" className="mt-1 text-2xl font-bold text-[#14261C]">
              Produtos da Feira Hoje
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:w-64">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C6F63]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produto ou família..."
                aria-label="Buscar produto ou família produtora"
                className="min-h-[48px] w-full rounded-xl border border-[#CED6CA] bg-white pl-10 pr-4 text-sm text-[#14261C] placeholder:text-[#6B7D71]"
              />
            </div>

            <div
              className="inline-flex rounded-xl border border-[#DCE2D8] bg-white p-1"
              role="group"
              aria-label="Filtrar por categoria"
            >
              {(['Todos', 'Agrícola', 'Artesanato'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`min-h-[48px] rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-[#166534] text-white'
                      : 'text-[#3D4F44] hover:bg-[#F1F5EF]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="h-40 animate-pulse rounded-2xl border border-[#DCE2D8] bg-white p-5"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#F5C2C0] bg-[#FEF2F2] p-6 text-center">
            <p className="text-sm font-medium text-[#991B1B]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#991B1B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7F1D1D]"
            >
              Tentar novamente
            </button>
          </div>
        ) : filteredProdutos.length === 0 ? (
          <div className="rounded-2xl border border-[#DCE2D8] bg-white p-8 text-center">
            <Sprout className="mx-auto h-8 w-8 text-[#5C6F63]" aria-hidden="true" />
            <p className="mt-3 text-base font-semibold text-[#14261C]">
              Nenhum produto encontrado para este filtro.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('Todos');
              }}
              className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[#CED6CA] bg-[#F6F7F4] px-5 py-2 text-sm font-semibold text-[#14261C] hover:bg-[#E9EDE6]"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProdutos.map((item) => {
              const disponivel = item.estoqueSaldo > 0;
              return (
                <article
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#DCE2D8] bg-white p-5"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-[#5C6F63]">
                      <span>{item.categoria}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{item.produtorFamilia}</span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-[#14261C]">
                      {item.nome}
                    </h3>
                    <p className="mt-1 text-xs text-[#5C6F63]">
                      Origem: {item.produtorLocalidade}
                    </p>
                  </div>

                  <div className="mt-5 flex items-end justify-between border-t border-[#ECEFE9] pt-4">
                    <div>
                      <span className="text-xl font-bold text-[#166534] tabular-nums">
                        {formatBRL(item.precoUnitarioCentavos)}
                      </span>
                      <span className="ml-1 text-xs font-medium text-[#5C6F63]">
                        / {item.unidade}
                      </span>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums ${
                        disponivel ? 'text-[#166534]' : 'text-[#9A3412]'
                      }`}
                    >
                      {disponivel ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>
                            Disponível · {item.estoqueSaldo} {item.unidade}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>Esgotado</span>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
