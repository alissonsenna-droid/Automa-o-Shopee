'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    AppmaxScripts?: {
      init: (options: {
        externalId: string;
        onIp?: (data: { ip: string }) => void;
        onTokenize?: (data: { token: string }) => void;
        onError?: (err: { code: string; message: string; stage: string; status?: number; details?: unknown }) => void;
      }) => void;
    };
  }
}

/**
 * Carrega e inicializa o Appmax JS (tokenização de cartão + coleta de IP no
 * browser, sem o número do cartão passar pelo nosso backend — exigência de
 * PCI-DSS). Baseado no guia oficial pra SPA/Next.js
 * (docs.appmax.com.br/guides/exemplo-checkout-spa): o script precisa achar
 * os formulários `data-appmax-customer`/`data-appmax-checkout` já montados
 * no DOM no momento do `init`, por isso o efeito só roda uma vez por
 * carregamento de página, quando `externalId` existir.
 */
export function useAppmax({
  externalId,
  onIp,
  onToken,
  onError,
}: {
  externalId: string | undefined;
  onIp: (ip: string) => void;
  onToken: (token: string) => void;
  onError: (message: string) => void;
}) {
  const handlers = useRef({ onIp, onToken, onError });
  handlers.current = { onIp, onToken, onError };

  useEffect(() => {
    if (!externalId) return;
    const scriptUrl = process.env.NEXT_PUBLIC_APPMAX_SCRIPT_URL;
    if (!scriptUrl) {
      console.error('[Appmax] NEXT_PUBLIC_APPMAX_SCRIPT_URL não configurado.');
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;

    script.onload = () => {
      try {
        window.AppmaxScripts?.init({
          externalId,
          onIp: ({ ip }) => handlers.current.onIp(ip),
          onTokenize: ({ token }) => handlers.current.onToken(token),
          onError: (err) => {
            console.error('[Appmax]', err.code, err.stage, err.status, err.details);
            handlers.current.onError(err.message || 'Falha ao processar o cartão.');
          },
        });
      } catch (err) {
        console.error('[Appmax] falha ao inicializar', err);
      }
    };

    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [externalId]);
}
