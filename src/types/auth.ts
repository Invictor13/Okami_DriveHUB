/**
 * Contratos de Autenticação — Google Identity Services (GIS)
 *
 * Modelagem de contratos para a futura PR04 (autenticação real).
 * Nenhum token deve ser mantido de forma insegura em armazenamento persistente.
 */

/**
 * Estados possíveis do ciclo de vida da autenticação
 */
export type AuthStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Metadados de sessão em memória volátil
 */
export interface TokenMetadata {
  tokenType: 'Bearer';
  expiresAt: number; // Timestamp Unix em milissegundos
  scope: string;
}

/**
 * Contrato de sessão do usuário
 */
export interface AuthSession {
  status: AuthStatus;
  userEmail?: string;
  userName?: string;
  userPicture?: string;
  expiresAt?: number;
}

/**
 * Erros padronizados do fluxo de autenticação
 */
export interface AuthError {
  code:
    | 'popup_closed'
    | 'access_denied'
    | 'network_error'
    | 'token_expired'
    | 'invalid_client'
    | 'unknown';
  message: string;
  details?: unknown;
}
