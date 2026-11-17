import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#166534] bg-[#F0F7F2] px-3.5 py-2 text-xs font-semibold text-[#166534] transition-colors hover:bg-[#DCFCE7] whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#D4DCD1] bg-white px-3.5 py-2 text-xs font-semibold text-[#14261C] transition-colors hover:bg-[#F1F5EF] whitespace-nowrap shrink-0"
        >
          <Share className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full max-w-sm rounded-2xl border border-[#E2E6DF] bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <h3 id="ios-install-title" className="text-lg font-bold text-[#14261C]">
                  Instalar no iPhone ou iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Fechar instruções"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-[#4A5D52] hover:bg-[#F1F5EF]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm text-[#314539]">
                <li>
                  1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.
                </li>
                <li>
                  2. Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
                </li>
                <li>
                  3. Confirme tocando em <strong>Adicionar</strong>.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#166534] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14532D]"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
