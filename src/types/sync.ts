/**
 * Contratos de Sincronização — Okami DriveHUB
 *
 * Estados e metadados que acompanham as operações com a API.
 * Regra inegociável: Não declarar sincronizado sem validação em tempo real.
 */

/**
 * Estados estritos de sincronização
 */
export type SyncStatus =
  'disconnected' | 'idle' | 'loading' | 'syncing' | 'synchronized' | 'error';

/**
 * Detalhe de erro de sincronização
 */
export interface SyncError {
  code: string;
  message: string;
  timestamp: string; // ISO 8601
  retryable: boolean;
}

/**
 * Estado reativo consolidado de sincronização
 */
export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null; // ISO 8601 ou null se nunca sincronizado
  itemCount: number;
  error: SyncError | null;
}
