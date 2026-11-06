/**
 * Armazenamento de Tokens em Memória Volátil — Okami DriveHUB
 *
 * REGRA INEGOCIÁVEL DE SEGURANÇA:
 * - O access token DEVE permanecer estritamente em memória volátil (RAM).
 * - NUNCA persistir o token em localStorage, sessionStorage, IndexedDB ou cookies.
 * - NUNCA expor o token em URLs, logs de console ou mensagens de erro.
 */

let memoryAccessToken: string | null = null;
let memoryExpiresAt: number | null = null;

/**
 * Armazena o access token e define seu tempo de expiração na memória volátil.
 *
 * @param token O access token emitido pelo Google Identity Services
 * @param expiresInSeconds Duração da validade em segundos (geralmente 3599s)
 */
export function setToken(token: string, expiresInSeconds: number): void {
  memoryAccessToken = token;

  if (expiresInSeconds <= 0) {
    memoryExpiresAt = Date.now() - 1000;
    return;
  }

  // Margem de segurança de 30 segundos para prevenir chamadas no limiar da expiração
  const safeSeconds = Math.max(expiresInSeconds - 30, 1);
  memoryExpiresAt = Date.now() + safeSeconds * 1000;
}

/**
 * Retorna o access token em memória, ou null se inexistente ou expirado.
 */
export function getToken(): string | null {
  if (!memoryAccessToken) {
    return null;
  }

  if (isTokenExpired()) {
    clearToken();
    return null;
  }

  return memoryAccessToken;
}

/**
 * Retorna o timestamp de expiração Unix (ms) ou null.
 */
export function getExpiresAt(): number | null {
  return memoryExpiresAt;
}

/**
 * Verifica se o token atual já atingiu seu tempo limite de expiração.
 */
export function isTokenExpired(): boolean {
  if (!memoryExpiresAt) {
    return true;
  }
  return Date.now() >= memoryExpiresAt;
}

/**
 * Verifica se existe um token válido e não expirado em memória.
 */
export function hasValidToken(): boolean {
  return getToken() !== null;
}

/**
 * Remove completamente o token da memória volátil.
 */
export function clearToken(): void {
  memoryAccessToken = null;
  memoryExpiresAt = null;
}
