import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Sanitiza mensagens de erro para impedir o vazamento acidental de tokens OAuth,
 * chaves de API, credenciais ou dados sensíveis nos diagnósticos de tela.
 */
export function sanitizeErrorMessage(rawMessage?: string | null): string {
  if (!rawMessage) return 'Erro desconhecido na aplicação.';

  return rawMessage
    .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]')
    .replace(/ya29\.[a-zA-Z0-9_-]+/g, 'ya29.[REDACTED]')
    .replace(
      /(?:access_token|client_secret|id_token)=([^&\s]+)/gi,
      'token=[REDACTED]'
    );
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Falha não capturada no Okami DriveHUB:', error, errorInfo);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      const safeMessage = sanitizeErrorMessage(this.state.error?.message);

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-console-dark p-6 text-center text-white">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-3xl text-rose-400">
            ⚠
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Erro de Inicialização
          </h1>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Ocorreu uma falha inesperada durante a montagem da interface.
          </p>
          <pre className="mt-4 max-w-lg overflow-x-auto rounded-xl bg-black/40 p-3 text-left font-mono text-xs text-rose-300">
            {safeMessage}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-nintendo-cyan px-5 py-2.5 text-xs font-bold text-slate-950 transition-all hover:brightness-110"
          >
            Recarregar Aplicação
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
