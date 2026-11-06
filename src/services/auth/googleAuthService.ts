/**
 * Serviço de Autenticação Google Identity Services (GIS) — Okami DriveHUB
 *
 * Implementa o OAuth 2.0 Token Model oficial da Google para Single Page Applications.
 *
 * REGRAS DE SEGURANÇA:
 * - Menor privilégio: apenas escopos de perfil e leitura de metadados do Drive.
 * - Tokens em memória volátil exclusivamente.
 * - Zero exposição de Client Secret ou tokens em URLs/logs.
 */

import { AuthError, AuthSession, GoogleUserProfile } from '@/types/auth';
import { loadGisScript } from './gisLoader';
import * as tokenStore from './tokenStore';

/**
 * Escopos mínimos estritos solicitados ao Google
 * - openid, email, profile: Identificação básica do usuário
 * - drive.metadata.readonly: Leitura estrita de metadados para futura navegação na PR05 (sem permissão de escrita)
 */
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
].join(' ');

/**
 * Endpoint oficial da Google para consulta de dados cadastrais básicos via OAuth2
 */
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

let clientIdOverride: string | null = null;

/**
 * Permite definir/sobrescrever programaticamente o Client ID (útil em testes automatizados).
 */
export function setGoogleClientIdOverride(id: string | null): void {
  clientIdOverride = id;
}

/**
 * Obtém o Client ID configurado nas variáveis de ambiente do Vite.
 * Retorna null se não estiver configurado ou se contiver o valor placeholder padrão.
 */
export function getGoogleClientId(): string | null {
  if (clientIdOverride !== null) {
    return clientIdOverride;
  }

  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (
    !envClientId ||
    typeof envClientId !== 'string' ||
    envClientId.trim() === '' ||
    envClientId.startsWith('YOUR_CLIENT_ID')
  ) {
    return null;
  }

  return envClientId.trim();
}

/**
 * Verifica se o aplicativo possui um Google Client ID válido configurado.
 */
export function isGoogleClientConfigured(): boolean {
  return getGoogleClientId() !== null;
}

/**
 * Converte erros brutos da Google ou exceções de rede em um AuthError padronizado.
 */
export function translateGisError(rawError: unknown): AuthError {
  if (typeof rawError === 'object' && rawError !== null) {
    const err = rawError as Record<string, unknown>;

    // Código de erro direto da API GIS (ex: response.error)
    const errorCode = String(err.error || err.type || err.code || '');

    if (
      errorCode === 'popup_closed_by_user' ||
      errorCode === 'popup_closed' ||
      errorCode === 'user_closed_popup'
    ) {
      return {
        code: 'popup_closed',
        message:
          'A janela de autorização do Google foi fechada antes da conclusão.',
      };
    }

    if (errorCode === 'access_denied') {
      return {
        code: 'access_denied',
        message:
          'Acesso não concedido. O Okami DriveHUB necessita de autorização para ler metadados do Drive.',
      };
    }

    if (errorCode === 'network_error') {
      return {
        code: 'network_error',
        message:
          'Falha de comunicação de rede ao autenticar com os servidores do Google.',
      };
    }

    if (errorCode === 'token_expired') {
      return {
        code: 'token_expired',
        message:
          'Sua sessão de acesso expirou. Conecte-se novamente para continuar.',
      };
    }
  }

  if (rawError instanceof Error) {
    const msg = rawError.message.toLowerCase();
    if (msg.includes('network') || msg.includes('failed to fetch')) {
      return {
        code: 'network_error',
        message: 'Falha de conexão com os serviços do Google.',
      };
    }
    return {
      code: 'unknown',
      message: rawError.message,
    };
  }

  return {
    code: 'unknown',
    message: 'Ocorreu um erro inesperado durante a autenticação com o Google.',
  };
}

/**
 * Consulta informações cadastrais básicas do usuário utilizando o access token em memória.
 * Não salva e nem expõe o token em logs.
 */
export async function fetchGoogleUserProfile(
  accessToken: string
): Promise<GoogleUserProfile | null> {
  try {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GoogleUserProfile;
    return data;
  } catch {
    // Falha silenciosa na leitura do perfil não deve inviabilizar a conexão se o token for válido
    return null;
  }
}

/**
 * Solicita autorização interativa ao usuário utilizando Google Identity Services (OAuth Token Model).
 */
export async function requestGoogleLogin(): Promise<AuthSession> {
  const clientId = getGoogleClientId();

  if (!clientId) {
    const error: AuthError = {
      code: 'invalid_client',
      message:
        'Client ID do Google não configurado. Defina a variável VITE_GOOGLE_CLIENT_ID no arquivo .env.local.',
    };
    throw error;
  }

  // Garante que o script oficial do Google foi carregado
  await loadGisScript();

  return new Promise<AuthSession>((resolve, reject) => {
    try {
      const tokenClient = window.google!.accounts!.oauth2!.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        callback: async (response) => {
          if (response.error) {
            return reject(translateGisError(response));
          }

          if (!response.access_token) {
            return reject({
              code: 'unknown',
              message: 'Nenhum token de acesso foi retornado pela Google.',
            });
          }

          // Armazenar com segurança exclusivamente na memória volátil
          const expiresInSeconds = Number(response.expires_in) || 3599;
          tokenStore.setToken(response.access_token, expiresInSeconds);

          // Buscar dados do perfil do usuário para identificação visual básica
          const profile = await fetchGoogleUserProfile(response.access_token);

          const session: AuthSession = {
            status: 'connected',
            userEmail: profile?.email,
            userName: profile?.name,
            userPicture: profile?.picture,
            expiresAt: tokenStore.getExpiresAt() ?? undefined,
          };

          resolve(session);
        },
        error_callback: (err) => {
          reject(translateGisError(err));
        },
      });

      // Abre o diálogo oficial de consentimento da Google
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(translateGisError(err));
    }
  });
}

/**
 * Encerra a sessão ativa do usuário: revoga o token junto à Google e limpa a memória volátil.
 */
export async function logoutGoogleSession(): Promise<AuthSession> {
  const currentToken = tokenStore.getToken();
  const oauth2 = window.google?.accounts?.oauth2;

  if (currentToken && oauth2) {
    try {
      await new Promise<void>((resolve) => {
        oauth2.revoke(currentToken, () => {
          resolve();
        });
      });
    } catch {
      // Ignora falhas na revogação remota para assegurar a limpeza local
    }
  }

  // Limpa o token da memória volátil da aplicação
  tokenStore.clearToken();

  return {
    status: 'disconnected',
  };
}
