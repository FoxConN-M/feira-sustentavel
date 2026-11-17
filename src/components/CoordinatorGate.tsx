import React from 'react';
import { Lock, Store } from 'lucide-react';

interface CoordinatorGateProps {
  title: string;
  description: string;
  onEnterPanel: () => void;
  onGoToVitrine: () => void;
}

export const CoordinatorGate: React.FC<CoordinatorGateProps> = ({
  title,
  description,
  onEnterPanel,
  onGoToVitrine,
}) => {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-[#DCE2D8] bg-white p-6 sm:p-8">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#166534]">
        <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Painel da Coordenação · Protótipo MVP</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold text-[#14261C]">{title}</h1>
      <p className="mt-2 text-sm text-[#4A5D52]">{description}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onEnterPanel}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#166534] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#14532D] disabled:opacity-60"
        >
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Acessar painel</span>
        </button>

        <button
          type="button"
          onClick={onGoToVitrine}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#CED6CA] bg-[#F6F7F4] px-5 py-3 text-sm font-semibold text-[#14261C] transition-colors hover:bg-[#E9EDE6]"
        >
          <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Ver Vitrine Pública</span>
        </button>
      </div>
    </div>
  );
};
