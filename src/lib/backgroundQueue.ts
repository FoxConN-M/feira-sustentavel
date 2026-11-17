import type { OfflineSaleItem } from '../types.ts';

const DATABASE_NAME = 'feira-sustentavel-offline';
const STORE_NAME = 'pending-sales';
const SYNC_TAG = 'feira-sustentavel-sales';

function openQueueDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste navegador.'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'clientSaleId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Falha ao abrir a fila offline.'));
  });
}

export async function persistPendingSale(sale: OfflineSaleItem): Promise<void> {
  const database = await openQueueDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(sale);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Falha ao salvar venda offline.'));
  });
  database.close();
}

export async function readPendingSales(): Promise<OfflineSaleItem[]> {
  const database = await openQueueDatabase();
  const sales = await new Promise<OfflineSaleItem[]>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as OfflineSaleItem[]);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return sales.sort((a, b) => a.createdAtIso.localeCompare(b.createdAtIso));
}

export async function removePendingSale(clientSaleId: string): Promise<void> {
  const database = await openQueueDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(clientSaleId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function registerSalesBackgroundSync(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const syncRegistration = registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> };
    };
    if (!syncRegistration.sync) return false;
    await syncRegistration.sync.register(SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}

export async function transmitPendingSales(): Promise<number> {
  const sales = await readPendingSales();
  let syncedCount = 0;
  for (const sale of sales) {
    const endpoint = new URL('/api/vendas', globalThis.location.origin);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        produtoId: sale.produtoId,
        quantidade: sale.quantidade,
        clientSaleId: sale.clientSaleId,
      }),
    });
    if (response.ok || [400, 404, 409, 422].includes(response.status)) {
      await removePendingSale(sale.clientSaleId);
      if (response.ok) syncedCount += 1;
      continue;
    }
    throw new Error(`Servidor indisponível (${response.status}).`);
  }
  return syncedCount;
}

export const SALES_SYNC_TAG = SYNC_TAG;
