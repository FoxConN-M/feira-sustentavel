import {
  OfflineSaleItem,
  Produtor,
  ProdutoComProdutor,
  ProdutoVitrine,
} from '../types.ts';

const OFFLINE_SALES_KEY = 'feira_sustentavel_pending_sales_v1';
const CACHE_VITRINE_KEY = 'feira_sustentavel_cache_vitrine_v1';
const CACHE_PRODUTOS_KEY = 'feira_sustentavel_cache_produtos_v1';
const CACHE_PRODUTORES_KEY = 'feira_sustentavel_cache_produtores_v1';

export function loadPendingSales(): OfflineSaleItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_SALES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingSales(items: OfflineSaleItem[]): void {
  try {
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function enqueueOfflineSale(sale: OfflineSaleItem): OfflineSaleItem[] {
  const current = loadPendingSales();
  const next = [sale, ...current];
  savePendingSales(next);
  return next;
}

export function saveCachedVitrine(items: ProdutoVitrine[]): void {
  try {
    localStorage.setItem(CACHE_VITRINE_KEY, JSON.stringify(items));
  } catch {
    // Ignore
  }
}

export function loadCachedVitrine(): ProdutoVitrine[] {
  try {
    const raw = localStorage.getItem(CACHE_VITRINE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedProdutos(items: ProdutoComProdutor[]): void {
  try {
    localStorage.setItem(CACHE_PRODUTOS_KEY, JSON.stringify(items));
  } catch {
    // Ignore
  }
}

export function loadCachedProdutos(): ProdutoComProdutor[] {
  try {
    const raw = localStorage.getItem(CACHE_PRODUTOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedProdutores(items: Produtor[]): void {
  try {
    localStorage.setItem(CACHE_PRODUTORES_KEY, JSON.stringify(items));
  } catch {
    // Ignore
  }
}

export function loadCachedProdutores(): Produtor[] {
  try {
    const raw = localStorage.getItem(CACHE_PRODUTORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function applyPendingDeductions(
  produtos: ProdutoComProdutor[],
  pendingSales: OfflineSaleItem[]
): ProdutoComProdutor[] {
  if (pendingSales.length === 0) return produtos;
  const deductedByProduct = new Map<number, number>();
  for (const s of pendingSales) {
    deductedByProduct.set(
      s.produtoId,
      (deductedByProduct.get(s.produtoId) || 0) + s.quantidade
    );
  }
  return produtos.map((p) => {
    const sub = deductedByProduct.get(p.id) || 0;
    return sub > 0 ? { ...p, estoqueSaldo: Math.max(0, p.estoqueSaldo - sub) } : p;
  });
}

export async function syncOfflineSalesQueue(
  getIdToken: () => Promise<string | null>
): Promise<{ syncedCount: number; remaining: OfflineSaleItem[]; lastError: string | null }> {
  const queue = loadPendingSales();
  if (queue.length === 0) {
    return { syncedCount: 0, remaining: [], lastError: null };
  }

  const token = await getIdToken();
  if (!token) {
    return {
      syncedCount: 0,
      remaining: queue,
      lastError: 'Faça login na coordenação para sincronizar as vendas pendentes.',
    };
  }

  const chronological = [...queue].reverse();
  const remaining: OfflineSaleItem[] = [];
  let syncedCount = 0;
  let lastError: string | null = null;

  for (const item of chronological) {
    try {
      const response = await fetch('/api/vendas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          clientSaleId: item.clientSaleId,
        }),
      });

      if (response.ok) {
        syncedCount += 1;
      } else if (response.status === 409 || response.status === 404 || response.status === 400) {
        const body = await response.json().catch(() => ({}));
        lastError = body.error || 'Conflito ao sincronizar uma venda offline.';
        // Keep failed validation item out or retain for user awareness? Retain only on transient/network; drop invalid after surfacing error? Better: drop 4xx only if conflict? Wait: keeping it would loop forever, so report and remove or keep? Let's keep network failures, drop unrecoverable 4xx with explicit error message.
      } else {
        remaining.unshift(item);
        lastError = 'Servidor indisponível durante a sincronização.';
      }
    } catch {
      remaining.unshift(item);
      lastError = 'Sem conexão para concluir a sincronização.';
    }
  }

  savePendingSales(remaining);
  return { syncedCount, remaining, lastError };
}
