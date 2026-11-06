/**
 * Cache em Memória Volátil da Sessão — Okami DriveHUB
 *
 * Armazena temporariamente os metadados de pastas visitadas durante a sessão ativa,
 * evitando requisições desnecessárias à Google Drive API ao navegar ou retroceder no Breadcrumb.
 *
 * REGRAS INEGOCIÁVEIS DE SEGURANÇA E INTEGRIDADE:
 * - Armazenamento estritamente em memória volátil (JavaScript Map).
 * - Proibido utilizar localStorage, sessionStorage ou IndexedDB.
 * - Proibido armazenar tokens, credenciais ou segredos no cache.
 * - Invalidação explícita ao atualizar uma pasta (refresh) ou ao desconectar a conta.
 * - O cache é efêmero e não substitui a API como fonte de verdade.
 */

import { DriveItem } from '@/types/drive';

export interface CachedFolderEntry {
  folderId: string;
  items: DriveItem[];
  nextPageToken?: string;
  cachedAt: number; // timestamp em milissegundos
}

/**
 * Tempo de vida padrão das entradas no cache: 5 minutos
 */
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

export class DriveMemoryCache {
  private cache = new Map<string, CachedFolderEntry>();
  private ttlMs: number;

  constructor(ttlMs = DEFAULT_CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  /**
   * Recupera os dados em cache de uma pasta se ainda forem válidos.
   */
  get(folderId: string): CachedFolderEntry | undefined {
    const entry = this.cache.get(folderId);
    if (!entry) return undefined;

    const isExpired = Date.now() - entry.cachedAt > this.ttlMs;
    if (isExpired) {
      this.cache.delete(folderId);
      return undefined;
    }

    return entry;
  }

  /**
   * Armazena ou atualiza os dados em cache de uma pasta.
   */
  set(
    folderId: string,
    items: DriveItem[],
    nextPageToken?: string,
    cachedAt = Date.now()
  ): void {
    this.cache.set(folderId, {
      folderId,
      items,
      nextPageToken,
      cachedAt,
    });
  }

  /**
   * Invalida e remove a entrada em cache de uma pasta específica.
   */
  invalidate(folderId: string): void {
    this.cache.delete(folderId);
  }

  /**
   * Limpa completamente o cache em memória (ex: no logout/desconexão).
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Quantidade de pastas armazenadas atualmente no cache.
   */
  get size(): number {
    return this.cache.size;
  }
}

// Instância singleton do cache em memória volátil
export const driveCache = new DriveMemoryCache();

