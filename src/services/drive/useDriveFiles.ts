/**
 * Hook de Gerenciamento de Arquivos e Navegação no Google Drive — Okami DriveHUB
 *
 * Encapsula o ciclo de vida da listagem real, paginação, navegação por pastas
 * e estados reativos de sincronização.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { DriveItem } from '@/types/drive';
import { SyncState, SyncError } from '@/types/sync';
import { useAuth } from '@/services/auth';
import { fetchDriveFiles, DriveServiceError } from './driveApiService';

export interface FolderBreadcrumb {
  id: string;
  name: string;
}

const ROOT_FOLDER: FolderBreadcrumb = {
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

  const [syncState, setSyncState] = useState<SyncState>({
    status: session.status === 'connected' ? 'idle' : 'disconnected',
    lastSyncedAt: null,
    itemCount: 0,
    error: null,
  });

  const currentFolder = folderStack[folderStack.length - 1] ?? ROOT_FOLDER;
  const currentFolderRef = useRef(currentFolder);
  currentFolderRef.current = currentFolder;

  // Carrega os itens da pasta indicada
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

        // Se for erro de autenticação (HTTP 401), deslogar localmente
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

  // Carrega mais itens (próxima página) mantendo os itens já carregados
  const loadNextPage = useCallback(async () => {
    if (!nextPageToken || isLoadingMore || session.status !== 'connected') {
      return;
    }

    setIsLoadingMore(true);

    try {
      const response = await fetchDriveFiles({
        parentId: currentFolderRef.current.id,
        pageToken: nextPageToken,
      });

      setItems((prevItems) => {
        const itemsMap = new Map<string, DriveItem>();
        // Preserva os itens já existentes
        for (const item of prevItems) {
          itemsMap.set(item.id, item);
        }
        // Adiciona novos itens da página sem duplicações
        for (const item of response.files) {
          itemsMap.set(item.id, item);
        }
        const updated = Array.from(itemsMap.values());

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

  // Navega para dentro de uma pasta filha
  const navigateToFolder = useCallback(
    async (folder: { id: string; name: string }) => {
      setFolderStack((prev) => [...prev, folder]);
      await fetchFolderContents(folder.id);
    },
    [fetchFolderContents]
  );

  // Retorna para a pasta pai (nível acima)
  const navigateUp = useCallback(async () => {
    if (folderStack.length <= 1) return;

    const newStack = folderStack.slice(0, folderStack.length - 1);
    setFolderStack(newStack);
    const targetFolder = newStack[newStack.length - 1] ?? ROOT_FOLDER;
    await fetchFolderContents(targetFolder.id);
  }, [folderStack, fetchFolderContents]);

  // Navega diretamente para um nível do breadcrumb
  const navigateToBreadcrumb = useCallback(
    async (index: number) => {
      if (index < 0 || index >= folderStack.length) return;

      const newStack = folderStack.slice(0, index + 1);
      setFolderStack(newStack);
      const targetFolder = newStack[newStack.length - 1] ?? ROOT_FOLDER;
      await fetchFolderContents(targetFolder.id);
    },
    [folderStack, fetchFolderContents]
  );

  // Atualiza a listagem da pasta atual
  const refresh = useCallback(async () => {
    await fetchFolderContents(currentFolderRef.current.id, true);
  }, [fetchFolderContents]);

  // Dispara o carregamento inicial da raiz assim que o usuário se conectar
  useEffect(() => {
    if (session.status === 'connected') {
      void fetchFolderContents(currentFolderRef.current.id);
    } else {
      setSyncState((prev) => ({
        ...prev,
        status: 'disconnected',
        itemCount: 0,
        error: null,
      }));
      setItems([]);
      setFolderStack([ROOT_FOLDER]);
      setNextPageToken(undefined);
    }
  }, [session.status, fetchFolderContents]);

  return {
    items,
    syncState,
    currentFolder,
    folderStack,
    nextPageToken,
    isLoadingMore,
    navigateToFolder,
    navigateUp,
    navigateToBreadcrumb,
    loadNextPage,
    refresh,
  };
}
