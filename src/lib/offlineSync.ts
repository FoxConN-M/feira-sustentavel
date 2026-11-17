import {
  OfflineSaleItem,
  Produtor,
  ProdutoComProdutor,
  ProdutoVitrine,
} from '../types.ts';
import {
  persistPendingSale,
  readPendingSales,
  registerSalesBackgroundSync,
  transmitPendingSales,
} from './backgroundQueue.ts';
import { apiUrl } from './api.ts';

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

export async function enqueueOfflineSale(sale: OfflineSaleItem): Promise<OfflineSaleItem[]> {
  const current = loadPendingSales();
  const next = [sale, ...current.filter((item) => item.clientSaleId !== sale.clientSaleId)];
  savePendingSales(next);
  try {
    await persistPendingSale(sale);
    void registerSalesBackgroundSync();
  } catch {
    // localStorage remains the fallback if IndexedDB is unavailable.
  }
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

export async function syncOfflineSalesQueue(): Promise<{
  syncedCount: number;
  remaining: OfflineSaleItem[];
  lastError: string | null;
}> {
  const legacyQueue = loadPendingSales();
  let syncedCount = 0;
  let lastError: string | null = null;
  let indexedDbAvailable = true;
  try {
    const stored = await readPendingSales();
    const storedIds = new Set(stored.map((item) => item.clientSaleId));
    for (const item of legacyQueue) {
      if (!storedIds.has(item.clientSaleId)) await persistPendingSale(item);
    }
  } catch {
    indexedDbAvailable = false;
  }
  if (indexedDbAvailable) {
    try {
      syncedCount = await transmitPendingSales();
    } catch {
      lastError = 'Sem conexão para concluir a sincronização.';
    }
  } else {
    const remainingLegacy: OfflineSaleItem[] = [];
    for (const item of [...legacyQueue].reverse()) {
      try {
        const response = await fetch(apiUrl('/api/vendas'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            clientSaleId: item.clientSaleId,
          }),
        });
        if (response.ok) syncedCount += 1;
        else if (response.status >= 500) remainingLegacy.unshift(item);
      } catch {
        remainingLegacy.unshift(item);
        lastError = 'Sem conexão para concluir a sincronização.';
      }
    }
    savePendingSales(remainingLegacy);
    return { syncedCount, remaining: remainingLegacy, lastError };
  }
  let remaining: OfflineSaleItem[];
  try {
    remaining = await readPendingSales();
  } catch {
    remaining = legacyQueue;
  }
  savePendingSales(remaining);
  return { syncedCount, remaining, lastError };
}
