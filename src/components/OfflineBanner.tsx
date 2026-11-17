import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  pendingCount,
  isSyncing,
  onSyncNow,
}) => {
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-[#F3D9B1] bg-[#FEF7EC] px-4 py-2.5 text-sm text-[#7C2D12]"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 font-medium">
          <WifiOff className="h-4 w-4 shrink-0 text-[#B45309]" aria-hidden="true" />
          {!isOnline ? (
            <span>
              Modo offline ativo — dados em cache exibidos.
              {pendingCount > 0
                ? ` ${pendingCount} venda(s) aguardando conexão para sincronizar.`
                : ' Vendas registradas serão salvas localmente.'}
            </span>
          ) : (
            <span>
              Conexão restabelecida — {pendingCount} venda(s) offline aguardando envio.
            </span>
          )}
        </div>

        {isOnline && pendingCount > 0 && (
          <button
            type="button"
            disabled={isSyncing}
            onClick={onSyncNow}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#9A3412] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#7C2D12] disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
