import React, { useCallback, useEffect, useState } from 'react';
import {
  FileBarChart2,
  LogOut,
  ShoppingBag,
  Sprout,
  Store,
} from 'lucide-react';
import { useOnlineStatus } from './hooks/useOnlineStatus.ts';
import {
  applyPendingDeductions,
  enqueueOfflineSale,
  loadCachedProdutores,
  loadCachedProdutos,
  loadCachedVitrine,
  loadPendingSales,
  saveCachedProdutores,
  saveCachedProdutos,
  saveCachedVitrine,
  savePendingSales,
  syncOfflineSalesQueue,
} from './lib/offlineSync.ts';
import { readPendingSales } from './lib/backgroundQueue.ts';
import { apiUrl, isStaticDemoMode } from './lib/api.ts';
import {
  adjustDemoStock,
  createDemoProduct,
  createDemoReport,
  demoShowcase,
  loadDemoProducts,
  loadDemoProducers,
  loadDemoSales,
  recordDemoSale,
} from './lib/demoMode.ts';
import {
  AppTab,
  CoordinatorUser,
  OfflineSaleItem,
  Produtor,
  ProdutoComProdutor,
  ProdutoVitrine,
  RelatorioRepassesResponse,
  VendaRecente,
} from './types.ts';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { OfflineBanner } from './components/OfflineBanner.tsx';
import { VitrinePublica } from './components/VitrinePublica.tsx';
import { RegistroVenda } from './components/RegistroVenda.tsx';
import { RelatoriosRepasses } from './components/RelatoriosRepasses.tsx';
import { CoordinatorGate } from './components/CoordinatorGate.tsx';

export default function App() {
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<AppTab>('inicio');

  const [coordinator, setCoordinator] = useState<CoordinatorUser | null>(null);

  // Public Vitrine state
  const [vitrine, setVitrine] = useState<ProdutoVitrine[]>(() => loadCachedVitrine());
  const [vitrineLoading, setVitrineLoading] = useState(true);
  const [vitrineError, setVitrineError] = useState<string | null>(null);

  // Coordinator operational state
  const [produtores, setProdutores] = useState<Produtor[]>(() => loadCachedProdutores());
  const [produtosServer, setProdutosServer] = useState<ProdutoComProdutor[]>(() =>
    loadCachedProdutos()
  );
  const [vendasRecentes, setVendasRecentes] = useState<VendaRecente[]>([]);
  const [pendingSales, setPendingSales] = useState<OfflineSaleItem[]>(() =>
    loadPendingSales()
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Report state
  const [periodo, setPeriodo] = useState<'hoje' | '7dias' | 'tudo'>('tudo');
  const [relatorio, setRelatorio] = useState<RelatorioRepassesResponse | null>(null);
  const [relatorioLoading, setRelatorioLoading] = useState(false);
  const [relatorioError, setRelatorioError] = useState<string | null>(null);

  const produtosComSaldoEfetivo = applyPendingDeductions(produtosServer, pendingSales);

  const fetchVitrine = useCallback(async () => {
    setVitrineLoading(true);
    setVitrineError(null);
    if (isStaticDemoMode) {
      const items = demoShowcase();
      setVitrine(items);
      saveCachedVitrine(items);
      setVitrineLoading(false);
      return;
    }
    try {
      const response = await fetch(apiUrl('/api/vitrine'));
      if (!response.ok) {
        throw new Error('Falha ao carregar vitrine.');
      }
      const data = await response.json();
      const items: ProdutoVitrine[] = data.produtos || [];
      setVitrine(items);
      saveCachedVitrine(items);
    } catch {
      const cached = loadCachedVitrine();
      if (cached.length > 0) {
        setVitrine(cached);
      } else {
        setVitrineError('Não foi possível carregar os produtos da vitrine.');
      }
    } finally {
      setVitrineLoading(false);
    }
  }, []);

  const fetchCoordinatorData = useCallback(async () => {
    if (isStaticDemoMode) {
      const producerItems = loadDemoProducers();
      const productItems = loadDemoProducts();
      const salesItems = loadDemoSales();
      setProdutores(producerItems);
      setProdutosServer(productItems);
      setVendasRecentes(salesItems);
      saveCachedProdutores(producerItems);
      saveCachedProdutos(productItems);
      return;
    }
    try {
      const [prodRes, itensRes, vendasRes] = await Promise.all([
        fetch(apiUrl('/api/produtores')),
        fetch(apiUrl('/api/produtos')),
        fetch(apiUrl('/api/vendas')),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProdutores(prodData.produtores || []);
        saveCachedProdutores(prodData.produtores || []);
      }
      if (itensRes.ok) {
        const itensData = await itensRes.json();
        setProdutosServer(itensData.produtos || []);
        saveCachedProdutos(itensData.produtos || []);
      }
      if (vendasRes.ok) {
        const vendasData = await vendasRes.json();
        setVendasRecentes(vendasData.vendas || []);
      }
    } catch {
      // Offline fallback already populated from cache
    }
  }, []);

  const fetchRelatorio = useCallback(
    async (targetPeriodo: 'hoje' | '7dias' | 'tudo') => {
      setRelatorioLoading(true);
      setRelatorioError(null);
      if (isStaticDemoMode) {
        setRelatorio(createDemoReport(targetPeriodo));
        setRelatorioLoading(false);
        return;
      }
      try {
        const response = await fetch(
          apiUrl(`/api/relatorios/repasses?periodo=${encodeURIComponent(targetPeriodo)}`)
        );
        if (!response.ok) {
          throw new Error('Falha ao carregar relatório.');
        }
        const data = (await response.json()) as RelatorioRepassesResponse;
        setRelatorio(data);
      } catch {
        setRelatorioError('Não foi possível gerar o relatório de repasses.');
      } finally {
        setRelatorioLoading(false);
      }
    },
    []
  );

  const handleSyncOfflineQueue = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    if (isStaticDemoMode) {
      setPendingSales([]);
      savePendingSales([]);
      return;
    }
    setIsSyncing(true);
    try {
      const result = await syncOfflineSalesQueue();
      setPendingSales(result.remaining);
      if (result.syncedCount > 0) {
        await Promise.all([
          fetchCoordinatorData(),
          fetchVitrine(),
          fetchRelatorio(periodo),
        ]);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [
    isSyncing,
    isOnline,
    fetchCoordinatorData,
    fetchVitrine,
    fetchRelatorio,
    periodo,
  ]);

  useEffect(() => {
    fetchVitrine();
  }, [fetchVitrine]);

  useEffect(() => {
    if (coordinator && activeTab === 'repasses') {
      fetchRelatorio(periodo);
    }
  }, [coordinator, activeTab, periodo, fetchRelatorio]);

  useEffect(() => {
    if (isOnline) {
      handleSyncOfflineQueue();
    }
  }, [isOnline, handleSyncOfflineQueue]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleWorkerMessage = (event: MessageEvent<{ type?: string; syncedCount?: number }>) => {
      if (event.data?.type !== 'sales-synced') return;
      void readPendingSales().then((remaining) => {
        setPendingSales(remaining);
        savePendingSales(remaining);
      });
      if ((event.data.syncedCount ?? 0) > 0) {
        void Promise.all([fetchCoordinatorData(), fetchVitrine(), fetchRelatorio(periodo)]);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleWorkerMessage);
  }, [fetchCoordinatorData, fetchVitrine, fetchRelatorio, periodo]);

  const handleSignIn = () => {
    setCoordinator({ uid: 'mvp-local', email: '', name: 'Coordenação', role: 'coordenacao' });
    void fetchCoordinatorData();
  };

  const handleSignOut = () => {
    setCoordinator(null);
    setActiveTab('inicio');
  };

  const handleRegisterSale = async ({
    produto,
    quantidade,
  }: {
    produto: ProdutoComProdutor;
    quantidade: number;
  }): Promise<{ ok: boolean; offlineQueued: boolean; message: string }> => {
    const clientSaleId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    if (isStaticDemoMode) {
      const result = recordDemoSale({ produtoId: produto.id, quantidade, clientSaleId });
      if (!result) {
        return { ok: false, offlineQueued: false, message: 'Estoque insuficiente para esta venda.' };
      }
      await Promise.all([fetchCoordinatorData(), fetchVitrine()]);
      return {
        ok: true,
        offlineQueued: false,
        message: `Venda salva nesta demonstração local: ${quantidade} ${produto.unidade} de ${produto.nome}.`,
      };
    }

    const queueOffline = async () => {
      const offlineItem: OfflineSaleItem = {
        clientSaleId,
        produtoId: produto.id,
        produtoNome: produto.nome,
        produtorFamilia: produto.produtorFamilia,
        unidade: produto.unidade,
        quantidade,
        precoUnitarioCentavos: produto.precoUnitarioCentavos,
        valorTotalCentavos: produto.precoUnitarioCentavos * quantidade,
        createdAtIso: new Date().toISOString(),
      };
      const updatedQueue = await enqueueOfflineSale(offlineItem);
      setPendingSales(updatedQueue);
      return {
        ok: true,
        offlineQueued: true,
        message: `Venda salva offline (${quantidade} ${produto.unidade} de ${produto.nome}). Será sincronizada assim que houver internet.`,
      };
    };

    if (!isOnline) {
      return queueOffline();
    }

    try {
      const response = await fetch(apiUrl('/api/vendas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtoId: produto.id,
          quantidade,
          clientSaleId,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        return {
          ok: false,
          offlineQueued: false,
          message: body.error || 'Não foi possível registrar a venda.',
        };
      }

      const data = await response.json();
      await Promise.all([fetchCoordinatorData(), fetchVitrine()]);

      return {
        ok: true,
        offlineQueued: false,
        message: `Venda confirmada: ${quantidade} ${produto.unidade} de ${produto.nome}. Novo saldo em estoque: ${data.produto?.estoqueSaldo ?? produto.estoqueSaldo - quantidade}.`,
      };
    } catch {
      return queueOffline();
    }
  };

  const handleCreateProduto = async (input: {
    produtorId: number;
    nome: string;
    categoria: 'Agrícola' | 'Artesanato';
    unidade: 'kg' | 'un' | 'maço' | 'pote' | 'litro';
    precoUnitarioCentavos: number;
    estoqueSaldo: number;
  }) => {
    if (isStaticDemoMode) {
      createDemoProduct(input);
      await Promise.all([fetchCoordinatorData(), fetchVitrine()]);
      return { ok: true, message: `Produto "${input.nome}" salvo nesta demonstração local.` };
    }
    try {
      const response = await fetch(apiUrl('/api/produtos'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: body.error || 'Falha ao cadastrar produto.' };
      }

      await Promise.all([fetchCoordinatorData(), fetchVitrine()]);
      return {
        ok: true,
        message: `Produto "${input.nome}" cadastrado com sucesso.`,
      };
    } catch {
      return { ok: false, message: 'Erro de conexão ao cadastrar produto.' };
    }
  };

  const handleAdjustStock = async (produtoId: number, novoSaldo: number) => {
    if (isStaticDemoMode) {
      if (!adjustDemoStock(produtoId, novoSaldo)) {
        return { ok: false, message: 'Não foi possível atualizar o estoque.' };
      }
      await Promise.all([fetchCoordinatorData(), fetchVitrine()]);
      return { ok: true, message: 'Estoque atualizado nesta demonstração local.' };
    }
    try {
      const response = await fetch(apiUrl(`/api/produtos/${produtoId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estoqueSaldo: novoSaldo }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: body.error || 'Falha ao atualizar estoque.' };
      }

      await Promise.all([fetchCoordinatorData(), fetchVitrine()]);
      return { ok: true, message: 'Estoque atualizado.' };
    } catch {
      return { ok: false, message: 'Erro de conexão ao atualizar estoque.' };
    }
  };

  const navItems: { id: AppTab; label: string; mobileLabel: string; icon: React.ReactNode }[] = [
    {
      id: 'inicio',
      label: 'Vitrine',
      mobileLabel: 'Vitrine',
      icon: <Store className="h-5 w-5" aria-hidden="true" />,
    },
    {
      id: 'vendas',
      label: 'Registrar Venda',
      mobileLabel: 'Vender',
      icon: <ShoppingBag className="h-5 w-5" aria-hidden="true" />,
    },
    {
      id: 'repasses',
      label: 'Repasses',
      mobileLabel: 'Repasses',
      icon: <FileBarChart2 className="h-5 w-5" aria-hidden="true" />,
    },
  ];

  return (
    <div className="min-h-dvh bg-[#F6F7F4] text-[#14261C] pb-20 md:pb-10">
      {/* Sticky Top Bar (compact 56px on mobile, 3-zone contract on desktop) */}
      <header className="sticky top-0 z-40 border-b border-[#DCE2D8] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 md:h-16">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('inicio')}
            className="inline-flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
          >
            <Sprout className="h-5 w-5 text-[#166534] shrink-0" aria-hidden="true" />
            <span className="font-display text-lg font-bold tracking-tight text-[#14261C]">
              Feira Sustentável
            </span>
          </button>

          {/* Zone 2: Clean Text Nav Links (desktop) */}
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-b-2 border-[#166534] font-semibold text-[#166534]'
                      : 'text-[#4A5D52] hover:text-[#14261C]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action / PWA Install */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton />

            {coordinator ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#CED6CA] bg-white px-3.5 py-2 text-xs font-semibold text-[#14261C] transition-colors hover:bg-[#F1F5EF] whitespace-nowrap shrink-0"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Sair</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#166534] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#14532D] disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  Entrar
                </button>
              )}
          </div>
        </div>
      </header>

      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingSales.length}
        isSyncing={isSyncing}
        onSyncNow={handleSyncOfflineQueue}
      />

      {isStaticDemoMode && (
        <aside className="mx-auto mt-4 max-w-7xl px-4 sm:px-6" role="status">
          <p className="rounded-xl border border-[#F3D9B1] bg-[#FEF7EC] px-4 py-3 text-sm text-[#713F12]">
            Demonstração GitHub Pages: vendas e alterações ficam somente neste navegador. Configure
            <code className="mx-1 rounded bg-white/70 px-1">VITE_API_BASE_URL</code>
            para conectar uma API FastAPI hospedada separadamente.
          </p>
        </aside>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {activeTab === 'inicio' && (
          <VitrinePublica
            produtos={vitrine}
            loading={vitrineLoading}
            error={vitrineError}
            coordinator={coordinator}
            onEnterPanel={handleSignIn}
            onNavigate={setActiveTab}
            onRetry={fetchVitrine}
          />
        )}

        {activeTab === 'vendas' &&
          (coordinator ? (
            <RegistroVenda
              isOnline={isOnline}
              produtores={produtores}
              produtos={produtosComSaldoEfetivo}
              vendasRecentes={vendasRecentes}
              pendingSales={pendingSales}
              onRegisterSale={handleRegisterSale}
            />
          ) : (
            <CoordinatorGate
              title="Registrar Venda"
              description="O registro de vendas com baixa automática no estoque é exclusivo para a coordenação da Feira Sustentável."
              onEnterPanel={handleSignIn}
              onGoToVitrine={() => setActiveTab('inicio')}
            />
          ))}

        {activeTab === 'repasses' &&
          (coordinator ? (
            <RelatoriosRepasses
              relatorio={relatorio}
              loading={relatorioLoading}
              error={relatorioError}
              periodo={periodo}
              pendingCount={pendingSales.length}
              onChangePeriodo={setPeriodo}
              onRetry={() => fetchRelatorio(periodo)}
            />
          ) : (
            <CoordinatorGate
              title="Relatório de Repasses por Produtor"
              description="Os consolidados financeiros e exportações por família produtora são restritos à coordenação."
              onEnterPanel={handleSignIn}
              onGoToVitrine={() => setActiveTab('inicio')}
            />
          ))}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-24 text-center text-sm text-[#4A5D52] sm:px-6 md:pb-8">
        <a
          href={`${import.meta.env.BASE_URL}status/`}
          className="inline-flex min-h-[48px] items-center font-semibold text-[#166534] underline-offset-4 hover:underline"
        >
          Status e disponibilidade da plataforma
        </a>
      </footer>

      {/* Mobile Fixed Bottom Thumb-Zone Tab Bar (h-16; total sticky height 120px <= 15% on mobile) */}
      <nav
        aria-label="Menu rápido inferior"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-3 border-t border-[#DCE2D8] bg-white/95 backdrop-blur-md md:hidden"
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 px-1 transition-colors ${
                active ? 'text-[#166534]' : 'text-[#5C6F63]'
              }`}
            >
              {item.icon}
              <span
                className={`text-[11px] leading-tight whitespace-nowrap ${
                  active ? 'font-bold' : 'font-medium'
                }`}
              >
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
