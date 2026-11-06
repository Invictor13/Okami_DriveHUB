/**
 * Carregador do Script Google Identity Services (GIS)
 *
 * Garante que a biblioteca oficial `google.accounts.oauth2` esteja disponível
 * antes de qualquer tentativa de inicialização de clientes OAuth.
 */

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Verifica se a API do Google Identity Services já está carregada no ambiente global.
 */
export function isGisLoaded(): boolean {
  return (
    typeof window !== 'undefined' && Boolean(window.google?.accounts?.oauth2)
  );
}

/**
 * Aguarda ou injeta o script oficial do Google Identity Services até sua disponibilização.
 *
 * @param timeoutMs Tempo limite máximo de espera em milissegundos
 * @returns Promessa resolvida com o objeto `google.accounts.oauth2`
 */
export function loadGisScript(
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<typeof google.accounts.oauth2> {
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2;
    if (oauth2) {
      return resolve(oauth2);
    }

    if (typeof window === 'undefined') {
      return reject(new Error('Ambiente sem suporte ao objeto window.'));
    }

    let checkInterval: ReturnType<typeof setInterval> | null = null;

    const timeoutId = setTimeout(() => {
      if (checkInterval) clearInterval(checkInterval);
      reject(
        new Error(
          'Tempo limite excedido ao carregar o Google Identity Services. Verifique sua conexão e se extensões de bloqueio não estão bloqueando o script.'
        )
      );
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (checkInterval) clearInterval(checkInterval);
    };

    // Verifica se a tag <script> já existe no DOM
    let scriptElement = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_SRC}"]`
    );

    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.src = GIS_SCRIPT_SRC;
      scriptElement.async = true;
      scriptElement.defer = true;
      document.head.appendChild(scriptElement);
    }

    // Polling leve para aguardar a inicialização do namespace google.accounts.oauth2
    checkInterval = setInterval(() => {
      const readyOauth2 = window.google?.accounts?.oauth2;
      if (readyOauth2) {
        cleanup();
        resolve(readyOauth2);
      }
    }, 50);

    scriptElement.addEventListener('error', () => {
      cleanup();
      reject(
        new Error(
          'Falha na requisição de rede para carregar o Google Identity Services (accounts.google.com/gsi/client).'
        )
      );
    });
  });
}
