/**
 * Hook de Gerenciamento de Arquivos, Busca e Navegação no Google Drive — Okami DriveHUB
 *
 * Encapsula o ciclo de vida da listagem real, paginação, busca com debounce,
 * cache volátil em memória e estados reativos de sincronização.
 *
 * REGRAS INEGOCIÁVEIS:
 * - Operações exclusivamente de LEITURA.
 * - Sincronização resiliente: AbortController, requestId sequencial, validação de queryKey.
 * - Deduplicação rigorosa pelo ID canônico original da Google Drive API v3.
 * - Cache em memória volátil via driveCache (zero tokens ou persistência em disco).
 * - Proteção estrita contra race conditions, respostas obsoletas e poluição de cache.
 * - Descarte imediato de cache e cancelamento seguro ao desconectar a sessão.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { DriveItem } from '@/types/drive';
import { SyncState, SyncError } from '@/types/sync';
import { useAuth } from '@/services/auth';
import { fetchDriveFiles, DriveServiceError } from './driveApiService';
import { driveCache } from './driveCache';

export interface FolderBreadcrumb {
  id: string;
  name: string;
}

export const ROOT_FOLDER: FolderBreadcrumb = {
  id: 'root',
  name: 'Meu Google Drive',
};

export interface UseDriveFilesReturn {
  items: DriveItem[];
  syncState: SyncState;
  currentFolder: FolderBreadcrumb;
  folderStack: FolderBreadcrumb[];
  nextPageToken: string | undefined;
  isLoadingMore: boolean;
  searchTerm: string;
  isSearching: boolean;
  restrictToFolder: boolean;
  setSearchTerm: (term: string) => void;
  setRestrictToFolder: (restrict: boolean) => void;
  clearSearch: () => void;
  navigateToFolder: (folder: { id: string; name: string }) => Promise<void>;
  navigateUp: () => Promise<void>;
  navigateToBreadcrumb: (index: number) => Promise<void>;
  loadNextPage: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDriveFiles(): UseDriveFilesReturn {
  const { session, logout } = useAuth();
  const [items, setItems] = useState<DriveItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(
    undefined
  );
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [folderStack, setFolderStack] = useState<FolderBreadcrumb[]>([
    ROOT_FOLDER,
  ]);

  // Estados de busca
  const [searchTerm, setSearchTermState] = useState<string>('');
  const [restrictToFolder, setRestrictToFolderState] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Mecanismos de controle de concorrência e resiliência
  const activeRequestIdRef = useRef<number>(0);
  const activeQueryKeyRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [syncState, setSyncState] = useState<SyncState>({
    status: session.status === 'connected' ? 'idle' : 'disconnected',
    lastSyncedAt: null,
    itemCount: 0,
    error: null,
  });

  const currentFolder = folderStack[folderStack.length - 1] ?? ROOT_FOLDER;
  const currentFolderRef = useRef(currentFolder);
  currentFolderRef.current = currentFolder;

  const restrictToFolderRef = useRef(restrictToFolder);
  restrictToFolderRef.current = restrictToFolder;

  const searchTermRef = useRef(searchTerm);
  searchTermRef.current = searchTerm;

  // Carrega o conteúdo de uma pasta (com proteção de concorrência e cache volátil)
  const fetchFolderContents = useCallback(
    async (folderId: string, isRefresh = false) => {
      if (session.status !== 'connected') {
        setSyncState({
          status: 'disconnected',
          lastSyncedAt: null,
          itemCount: 0,
          error: null,
        });
        setItems([]);
        return;
      }

      // Aborta qualquer requisição anterior em voo
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Registra identidade e identificador sequencial da consulta
      const currentRequestId = ++activeRequestIdRef.current;
      const expectedQueryKey = `folder:${folderId}`;
      activeQueryKeyRef.current = expectedQueryKey;

      // Se não for refresh forçado, verificar o cache volátil em memória
      if (!isRefresh) {
        const cached = driveCache.get(folderId);
        if (cached) {
          if (
            currentRequestId === activeRequestIdRef.current &&
            expectedQueryKey === activeQueryKeyRef.current
          ) {
            setItems(cached.items);
            setNextPageToken(cached.nextPageToken);
            setSyncState({
              status: 'synchronized',
              lastSyncedAt: new Date(cached.cachedAt).toISOString(),
              itemCount: cached.items.length,
              error: null,
            });
          }
          return;
        }
      } else {
        // Se for refresh forçado, invalidar a entrada do cache da pasta
        driveCache.invalidate(folderId);
      }

      setSyncState((prev) => ({
        ...prev,
        status: isRefresh ? 'syncing' : 'loading',
        error: null,
      }));

      try {
        const response = await fetchDriveFiles({
          parentId: folderId,
          signal: controller.signal,
        });

        // Valida se a resposta ainda pertence à consulta ativa e ao requestId corrente
        if (
          currentRequestId !== activeRequestIdRef.current ||
          expectedQueryKey !== activeQueryKeyRef.current
        ) {
          return;
        }

        // Deduplicação pelo ID canônico original da Google Drive API
        const itemsMap = new Map<string, DriveItem>();
        for (const file of response.files) {
          itemsMap.set(file.id, file);
        }
        const uniqueFiles = Array.from(itemsMap.values());

        // Salva com segurança no cache em memória volátil
        driveCache.set(folderId, uniqueFiles, response.nextPageToken);

        setItems(uniqueFiles);
        setNextPageToken(response.nextPageToken);

        setSyncState({
          status: 'synchronized',
          lastSyncedAt: new Date().toISOString(),
          itemCount: uniqueFiles.length,
          error: null,
        });
      } catch (err) {
        // Descarte silencioso de cancelamento esperado
        if ((err as Error)?.name === 'AbortError') {
          return;
        }

        // Se a requisição já for obsoleta, ignorar erro
        if (
          currentRequestId !== activeRequestIdRef.current ||
          expectedQueryKey !== activeQueryKeyRef.current
        ) {
          return;
        }

        const driveErr = err as DriveServiceError;

        if (driveErr.code === 'unauthenticated') {
          void logout();
        }

        const syncError: SyncError = {
          code: driveErr.code || 'unknown',
          message:
            driveErr.message || 'Falha ao sincronizar com o Google Drive.',
          timestamp: new Date().toISOString(),
          retryable:
            driveErr.code !== 'unauthenticated' &&
            driveErr.code !== 'forbidden',
        };

        setSyncState((prev) => ({
          ...prev,
          status: 'error',
          error: syncError,
        }));
      }
    },
    [session.status, logout]
  );

  // Executa busca na Google Drive API com proteção de concorrência
  const executeSearch = useCallback(
    async (term: string, restrict: boolean) => {
      if (session.status !== 'connected') return;

      const trimmed = term.trim();
      if (!trimmed) {
        setIsSearching(false);
        void fetchFolderContents(currentFolderRef.current.id);
        return;
      }

      // Aborta qualquer requisição anterior em voo
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const currentRequestId = ++activeRequestIdRef.current;
      const targetFolderId = currentFolderRef.current.id;
      const expectedQueryKey = `search:${trimmed}:${restrict ? targetFolderId : 'global'}`;
      activeQueryKeyRef.current = expectedQueryKey;

      setIsSearching(true);
      setSyncState((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
      }));

      try {
        const response = await fetchDriveFiles({
          parentId: targetFolderId,
          searchTerm: trimmed,
          restrictToFolder: restrict,
          signal: controller.signal,
        });

        // Valida se a resposta ainda corresponde à busca ativa
        if (
          currentRequestId !== activeRequestIdRef.current ||
          expectedQueryKey !== activeQueryKeyRef.current
        ) {
          return;
        }

        const itemsMap = new Map<string, DriveItem>();
        for (const file of response.files) {
          itemsMap.set(file.id, file);
        }
        const uniqueFiles = Array.from(itemsMap.values());

        setItems(uniqueFiles);
        setNextPageToken(response.nextPageToken);

        setSyncState({
          status: 'synchronized',
          lastSyncedAt: new Date().toISOString(),
          itemCount: uniqueFiles.length,
          error: null,
        });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return;
        }

        if (
          currentRequestId !== activeRequestIdRef.current ||
          expectedQueryKey !== activeQueryKeyRef.current
        ) {
          return;
        }

        const driveErr = err as DriveServiceError;

        if (driveErr.code === 'unauthenticated') {
          void logout();
        }

        const syncError: SyncError = {
          code: driveErr.code || 'unknown',
          message: driveErr.message || 'Falha na pesquisa no Google Drive.',
          timestamp: new Date().toISOString(),
          retryable:
            driveErr.code !== 'unauthenticated' &&
            driveErr.code !== 'forbidden',
        };

        setSyncState((prev) => ({
          ...prev,
          status: 'error',
          error: syncError,
        }));
      }
    },
    [session.status, logout, fetchFolderContents]
  );

  // Define o termo de busca com debounce de 350ms
  const setSearchTerm = useCallback(
    (term: string) => {
      setSearchTermState(term);
      searchTermRef.current = term;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const trimmed = term.trim();
      if (!trimmed) {
        setIsSearching(false);
        void fetchFolderContents(currentFolderRef.current.id);
        return;
      }

      setIsSearching(true);
      debounceTimerRef.current = setTimeout(() => {
        void executeSearch(trimmed, restrictToFolderRef.current);
      }, 350);
    },
    [executeSearch, fetchFolderContents]
  );

  // Altera restrição da busca à pasta atual
  const setRestrictToFolder = useCallback(
    (restrict: boolean) => {
      setRestrictToFolderState(restrict);
      restrictToFolderRef.current = restrict;

      if (searchTermRef.current.trim()) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        void executeSearch(searchTermRef.current.trim(), restrict);
      }
    },
    [executeSearch]
  );

  // Limpa a busca e restaura o conteúdo da pasta
  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearchTermState('');
    searchTermRef.current = '';
    setIsSearching(false);
    void fetchFolderContents(currentFolderRef.current.id);
  }, [fetchFolderContents]);

  // Carrega mais itens (próxima página) com vinculação estrita à consulta de origem
  const loadNextPage = useCallback(async () => {
    const originQueryKey = activeQueryKeyRef.current;
    const tokenToFetch = nextPageToken;
    const folderId = currentFolderRef.current.id;
    const activeSearch = searchTermRef.current.trim();
    const restrict = restrictToFolderRef.current;

    if (
      !tokenToFetch ||
      isLoadingMore ||
      session.status !== 'connected' ||
      !originQueryKey
    ) {
      return;
    }

    // Aborta requisição de rede anterior antes de iniciar paginação
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentRequestId = ++activeRequestIdRef.current;
    setIsLoadingMore(true);

    try {
      const response = await fetchDriveFiles({
        parentId: folderId,
        pageToken: tokenToFetch,
        searchTerm: activeSearch || undefined,
        restrictToFolder: restrict,
        signal: controller.signal,
      });

      // Validação: a consulta ativa e o requestId mudaram enquanto a página carregava?
      if (
        currentRequestId !== activeRequestIdRef.current ||
        originQueryKey !== activeQueryKeyRef.current
      ) {
        return;
      }

      setItems((prevItems) => {
        if (
          currentRequestId !== activeRequestIdRef.current ||
          originQueryKey !== activeQueryKeyRef.current
        ) {
          return prevItems;
        }

        const itemsMap = new Map<string, DriveItem>();
        for (const item of prevItems) {
          itemsMap.set(item.id, item);
        }
        for (const item of response.files) {
          itemsMap.set(item.id, item);
        }
        const updated = Array.from(itemsMap.values());

        // Se não for busca, atualizar o cache da pasta com a listagem ampliada
        if (!activeSearch) {
          driveCache.set(folderId, updated, response.nextPageToken);
        }

        setSyncState((prevSync) => ({
          ...prevSync,
          itemCount: updated.length,
          lastSyncedAt: new Date().toISOString(),
        }));

        return updated;
      });

      setNextPageToken(response.nextPageToken);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return;
      }

      if (
        currentRequestId !== activeRequestIdRef.current ||
        originQueryKey !== activeQueryKeyRef.current
      ) {
        return;
      }

      const driveErr = err as DriveServiceError;
      const syncError: SyncError = {
        code: driveErr.code || 'unknown',
        message: driveErr.message || 'Falha ao carregar mais arquivos.',
        timestamp: new Date().toISOString(),
        retryable: true,
      };

      setSyncState((prev) => ({
        ...prev,
        error: syncError,
      }));
    } finally {
      if (
        currentRequestId === activeRequestIdRef.current &&
        originQueryKey === activeQueryKeyRef.current
      ) {
        setIsLoadingMore(false);
      }
    }
  }, [nextPageToken, isLoadingMore, session.status]);

  // Navega para uma subpasta
  const navigateToFolder = useCallback(
    async (folder: { id: string; name: string }) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setSearchTermState('');
      searchTermRef.current = '';
      setIsSearching(false);

      setFolderStack((prev) => [...prev, folder]);
      await fetchFolderContents(folder.id);
    },
    [fetchFolderContents]
  );

  // Retorna um nível na hierarquia de pastas
  const navigateUp = useCallback(async () => {
    if (folderStack.length <= 1) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearchTermState('');
    searchTermRef.current = '';
    setIsSearching(false);

    const newStack = folderStack.slice(0, folderStack.length - 1);
    setFolderStack(newStack);
    const targetFolder = newStack[newStack.length - 1] ?? ROOT_FOLDER;
    await fetchFolderContents(targetFolder.id);
  }, [folderStack, fetchFolderContents]);

  // Navega para um ponto arbitrário do breadcrumb
  const navigateToBreadcrumb = useCallback(
    async (index: number) => {
      if (index < 0 || index >= folderStack.length) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setSearchTermState('');
      searchTermRef.current = '';
      setIsSearching(false);

      const newStack = folderStack.slice(0, index + 1);
      setFolderStack(newStack);
      const targetFolder = newStack[newStack.length - 1] ?? ROOT_FOLDER;
      await fetchFolderContents(targetFolder.id);
    },
    [folderStack, fetchFolderContents]
  );

  // Atualização manual da pasta
  const refresh = useCallback(async () => {
    if (searchTermRef.current.trim()) {
      await executeSearch(searchTermRef.current, restrictToFolderRef.current);
    } else {
      await fetchFolderContents(currentFolderRef.current.id, true);
    }
  }, [fetchFolderContents, executeSearch]);

  // Limpeza de timers e cancelamento no desmonte do hook
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Efeito de conexão e desconexão da sessão
  useEffect(() => {
    if (session.status === 'connected') {
      void fetchFolderContents(currentFolderRef.current.id);
    } else {
      // Aborta imediatamente requisições ativas no logout
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      activeRequestIdRef.current++;
      activeQueryKeyRef.current = '';

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Limpa integralmente o cache em memória no logout
      driveCache.clear();

      setSyncState({
        status: 'disconnected',
        lastSyncedAt: null,
        itemCount: 0,
        error: null,
      });
      setItems([]);
      setFolderStack([ROOT_FOLDER]);
      setNextPageToken(undefined);
      setSearchTermState('');
      searchTermRef.current = '';
      setIsSearching(false);
    }
  }, [session.status, fetchFolderContents]);

  return {
    items,
    syncState,
    currentFolder,
    folderStack,
    nextPageToken,
    isLoadingMore,
    searchTerm,
    isSearching,
    restrictToFolder,
    setSearchTerm,
    setRestrictToFolder,
    clearSearch,
    navigateToFolder,
    navigateUp,
    navigateToBreadcrumb,
    loadNextPage,
    refresh,
  };
}
