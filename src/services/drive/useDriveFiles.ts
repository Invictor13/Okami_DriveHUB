/**
 * Hook de Gerenciamento de Arquivos, Busca e Navegação no Google Drive — Okami DriveHUB
 *
 * Encapsula o ciclo de vida da listagem real, paginação, busca com debounce,
 * cache volátil em memória e estados reativos de sincronização.
 *
 * REGRAS INEGOCIÁVEIS:
 * - Operações exclusivamente de LEITURA.
 * - Deduplicação rigorosa pelo ID canônico original da Google Drive API v3.
 * - Cache em memória volátil via driveCache (zero tokens ou persistência em disco).
 * - Tratamento seguro de busca com expressão 'name contains' da Drive API.
 * - Descarte imediato de cache e dados ao desconectar a sessão.
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

  // Carrega o conteúdo de uma pasta (com cache em memória volátil)
  const fetchFolderContents = useCallback(
    async (folderId: string, isRefresh = false) => {
      if (session.status !== 'connected') {
        setSyncState((prev) => ({
          ...prev,
          status: 'disconnected',
          error: null,
        }));
        setItems([]);
        return;
      }

      // Se não for atualização forçada (refresh), verificar se já existe no cache em memória
      if (!isRefresh) {
        const cached = driveCache.get(folderId);
        if (cached) {
          setItems(cached.items);
          setNextPageToken(cached.nextPageToken);
          setSyncState({
            status: 'synchronized',
            lastSyncedAt: new Date(cached.cachedAt).toISOString(),
            itemCount: cached.items.length,
            error: null,
          });
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
        const response = await fetchDriveFiles({ parentId: folderId });

        // Deduplicação pelo ID canônico original da Google Drive API
        const itemsMap = new Map<string, DriveItem>();
        for (const file of response.files) {
          itemsMap.set(file.id, file);
        }
        const uniqueFiles = Array.from(itemsMap.values());

        // Salva no cache em memória volátil
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
        const driveErr = err as DriveServiceError;

        if (driveErr.code === 'unauthenticated') {
          void logout();
        }

        const syncError: SyncError = {
          code: driveErr.code,
          message: driveErr.message,
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

  // Executa busca direta na Google Drive API
  const executeSearch = useCallback(
    async (term: string, restrict: boolean) => {
      if (session.status !== 'connected') return;

      const trimmed = term.trim();
      if (!trimmed) {
        setIsSearching(false);
        void fetchFolderContents(currentFolderRef.current.id);
        return;
      }

      setIsSearching(true);
      setSyncState((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
      }));

      try {
        const response = await fetchDriveFiles({
          parentId: currentFolderRef.current.id,
          searchTerm: trimmed,
          restrictToFolder: restrict,
        });

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
        const driveErr = err as DriveServiceError;

        if (driveErr.code === 'unauthenticated') {
          void logout();
        }

        const syncError: SyncError = {
          code: driveErr.code,
          message: driveErr.message,
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

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        void executeSearch(term, restrictToFolderRef.current);
      }, 350);
    },
    [executeSearch]
  );

  // Altera restrição da busca à pasta atual
  const setRestrictToFolder = useCallback(
    (restrict: boolean) => {
      setRestrictToFolderState(restrict);
      if (searchTermRef.current.trim()) {
        void executeSearch(searchTermRef.current, restrict);
      }
    },
    [executeSearch]
  );

  // Limpa a busca e restaura o conteúdo da pasta
  const clearSearch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchTermState('');
    setIsSearching(false);
    void fetchFolderContents(currentFolderRef.current.id);
  }, [fetchFolderContents]);

  // Carrega mais itens (próxima página)
  const loadNextPage = useCallback(async () => {
    if (!nextPageToken || isLoadingMore || session.status !== 'connected') {
      return;
    }

    setIsLoadingMore(true);

    try {
      const activeSearch = searchTermRef.current.trim();
      const response = await fetchDriveFiles({
        parentId: currentFolderRef.current.id,
        pageToken: nextPageToken,
        searchTerm: activeSearch || undefined,
        restrictToFolder: restrictToFolderRef.current,
      });

      setItems((prevItems) => {
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
          driveCache.set(
            currentFolderRef.current.id,
            updated,
            response.nextPageToken
          );
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
      const driveErr = err as DriveServiceError;
      const syncError: SyncError = {
        code: driveErr.code,
        message: driveErr.message,
        timestamp: new Date().toISOString(),
        retryable: true,
      };

      setSyncState((prev) => ({
        ...prev,
        error: syncError,
      }));
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextPageToken, isLoadingMore, session.status]);

  // Navega para uma subpasta
  const navigateToFolder = useCallback(
    async (folder: { id: string; name: string }) => {
      // Ao navegar, limpar busca ativa
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setSearchTermState('');
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
    }
    setSearchTermState('');
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
      }
      setSearchTermState('');
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

  // Limpeza de timers no desmonte
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Efeito de conexão e desconexão da sessão
  useEffect(() => {
    if (session.status === 'connected') {
      void fetchFolderContents(currentFolderRef.current.id);
    } else {
      // Limpa integralmente o cache em memória no logout
      driveCache.clear();

      setSyncState((prev) => ({
        ...prev,
        status: 'disconnected',
        itemCount: 0,
        error: null,
      }));
      setItems([]);
      setFolderStack([ROOT_FOLDER]);
      setNextPageToken(undefined);
      setSearchTermState('');
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
