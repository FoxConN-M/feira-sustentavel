import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  WifiOff,
} from 'lucide-react';
import { RelatorioRepassesResponse } from '../types.ts';
import { buildRepassesCsv, formatBRL } from '../lib/validation.ts';

interface RelatoriosRepassesProps {
  relatorio: RelatorioRepassesResponse | null;
  loading: boolean;
  error: string | null;
  periodo: 'hoje' | '7dias' | 'tudo';
  pendingCount: number;
  onChangePeriodo: (periodo: 'hoje' | '7dias' | 'tudo') => void;
  onRetry: () => void;
}

const PERIODO_LABELS: Record<'hoje' | '7dias' | 'tudo', string> = {
  hoje: 'Hoje',
  '7dias': '7 dias',
  tudo: 'Todo o período',
};

export const RelatoriosRepasses: React.FC<RelatoriosRepassesProps> = ({
  relatorio,
  loading,
  error,
  periodo,
  pendingCount,
  onChangePeriodo,
  onRetry,
}) => {
  const [expandedProdutorId, setExpandedProdutorId] = useState<number | null>(null);

  const handleExportCsv = () => {
    if (!relatorio) return;
    const csvContent = buildRepassesCsv(
      relatorio.repasses,
      PERIODO_LABELS[periodo]
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `repasses-feira-${periodo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold text-[#166534]">
            RF03 · Transparência Financeira & Prestação de Contas
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#14261C] sm:text-3xl">
            Repasses por Produtor
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex rounded-xl border border-[#DCE2D8] bg-white p-1"
            role="group"
            aria-label="Selecionar período do relatório"
          >
            {(['hoje', '7dias', 'tudo'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onChangePeriodo(key)}
                className={`min-h-[48px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  periodo === key
                    ? 'bg-[#166534] text-white'
                    : 'text-[#3D4F44] hover:bg-[#F1F5EF]'
                }`}
              >
                {PERIODO_LABELS[key]}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={!relatorio || loading}
            onClick={handleExportCsv}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#166534] bg-white px-4 py-2 text-xs font-bold text-[#166534] transition-colors hover:bg-[#F0F7F2] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-[#F3D9B1] bg-[#FEF7EC] p-4 text-sm font-medium text-[#7C2D12]"
        >
          <WifiOff className="h-5 w-5 shrink-0 text-[#B45309]" aria-hidden="true" />
          <span>
            Existem {pendingCount} venda(s) offline ainda não enviadas. Sincronize-as
            para incluir esses valores no relatório consolidado do servidor.
          </span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-2xl border border-[#DCE2D8] bg-white"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#F5C2C0] bg-[#FEF2F2] p-6 text-center">
          <p className="text-sm font-medium text-[#991B1B]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#991B1B] px-5 py-2 text-sm font-semibold text-white"
          >
            Tentar novamente
          </button>
        </div>
      ) : relatorio ? (
        <>
          {/* Summary KPI Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#DCE2D8] bg-white p-5">
              <p className="text-xs font-semibold text-[#5C6F63]">
                Total Consolidado de Repasses
              </p>
              <p className="mt-2 text-3xl font-bold text-[#166534] tabular-nums">
                {formatBRL(relatorio.totalGeralCentavos)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#DCE2D8] bg-white p-5">
              <p className="text-xs font-semibold text-[#5C6F63]">
                Vendas Confirmadas
              </p>
              <p className="mt-2 text-3xl font-bold text-[#14261C] tabular-nums">
                {relatorio.totalGeralTransacoes}
              </p>
            </div>
            <div className="rounded-2xl border border-[#DCE2D8] bg-white p-5">
              <p className="text-xs font-semibold text-[#5C6F63]">
                Unidades Comercializadas
              </p>
              <p className="mt-2 text-3xl font-bold text-[#14261C] tabular-nums">
                {relatorio.totalGeralItens}
              </p>
            </div>
          </div>

          {/* Producer Breakdown Table / Expandable Rows */}
          <section className="overflow-hidden rounded-2xl border border-[#DCE2D8] bg-white">
            <div className="flex items-center justify-between border-b border-[#ECEFE9] px-5 py-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#14261C]">
                <FileSpreadsheet className="h-4 w-4 text-[#166534]" aria-hidden="true" />
                <span>
                  Detalhamento por Família Produtora ({relatorio.produtoresAtivos} famílias)
                </span>
              </div>
              <span className="text-xs font-medium text-[#5C6F63]">
                Período: {PERIODO_LABELS[periodo]}
              </span>
            </div>

            <div className="divide-y divide-[#ECEFE9]">
              {relatorio.repasses.map((rep) => {
                const isExpanded = expandedProdutorId === rep.produtorId;
                const hasItems = rep.itensDetalhados.length > 0;
                return (
                  <div key={rep.produtorId}>
                    <button
                      type="button"
                      disabled={!hasItems}
                      aria-expanded={hasItems ? isExpanded : undefined}
                      aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} detalhes de ${rep.familia}`}
                      onClick={() =>
                        setExpandedProdutorId(isExpanded ? null : rep.produtorId)
                      }
                      className="flex min-h-[64px] w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-[#F8FAF7] disabled:cursor-default disabled:hover:bg-white"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-[#14261C]">
                          {rep.familia}
                        </p>
                        <p className="truncate text-xs text-[#5C6F63]">
                          {rep.nome} · {rep.localidade} · {rep.totalTransacoes}{' '}
                          venda(s) · {rep.totalItensVendidos} item(ns)
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`text-base font-bold tabular-nums ${
                            rep.valorRepasseCentavos > 0
                              ? 'text-[#166534]'
                              : 'text-[#6B7D71]'
                          }`}
                        >
                          {formatBRL(rep.valorRepasseCentavos)}
                        </span>
                        {hasItems &&
                          (isExpanded ? (
                            <ChevronUp
                              className="h-4 w-4 text-[#5C6F63]"
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronDown
                              className="h-4 w-4 text-[#5C6F63]"
                              aria-hidden="true"
                            />
                          ))}
                      </div>
                    </button>

                    {isExpanded && hasItems && (
                      <div className="border-t border-[#ECEFE9] bg-[#F8FAF7] px-5 py-3">
                        <p className="mb-2 text-xs font-semibold text-[#5C6F63]">
                          Itens vendidos por {rep.familia}
                        </p>
                        <ul className="space-y-1.5 text-sm">
                          {rep.itensDetalhados.map((item) => (
                            <li
                              key={item.produtoId}
                              className="flex items-center justify-between gap-4 text-[#314539]"
                            >
                              <span>
                                {item.nome} ({item.quantidade} {item.unidade})
                              </span>
                              <span className="font-semibold tabular-nums">
                                {formatBRL(item.totalCentavos)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};
