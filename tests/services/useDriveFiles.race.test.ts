/**
 * Testes Automatizados de Sincronização Resiliente e Concorrência — PR07
 *
 * Valida a eliminação estrita de condições de corrida (race conditions),
 * cancelamento via AbortController, validação de queryKey, identificador
 * sequencial (requestId) e proteção contra poluição de cache.
 *
 * REGRAS INEGOCIÁVEIS:
 * - Respostas obsoletas NUNCA podem substituir resultados da consulta atual.
 * - Cancelamento seguro não pode gerar erro visual para o usuário.
 * - O cache em memória volátil não pode ser corrompido por requisições antigas.
 * - Deduplicação rigorosa pelo ID canônico da Google Drive API v3.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDriveFiles, ROOT_FOLDER } from '@/services/drive/useDriveFiles';
import * as driveApiService from '@/services/drive/driveApiService';
import * as authService from '@/services/auth';
import { driveCache } from '@/services/drive/driveCache';
import { mockValidDriveFile, mockValidDriveFolder } from '../mocks/driveMocks';
import { DriveItem } from '@/types/drive';

const fileAlpha: DriveItem = {
  ...mockValidDriveFile,
  id: 'canonical_file_alpha_id',
  name: 'Relatório Alpha.pdf',
};

const fileBeta: DriveItem = {
  ...mockValidDriveFile,
  id: 'canonical_file_beta_id',
  name: 'Relatório Beta.pdf',
};

const folderA = {
  id: 'folder_alpha_id',
  name: 'Pasta Alpha',
};

const folderB = {
  id: 'folder_beta_id',
  name: 'Pasta Beta',
};

describe('useDriveFiles — Sincronização Resiliente e Concorrência (PR07)', () => {
  beforeEach(() => {
    driveCache.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    driveCache.clear();
    vi.restoreAllMocks();
  });

  it('1. Pesquisa A iniciada antes de B, mas concluída depois: resultados de B prevalecem', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    let resolveSearchA: (value: { files: DriveItem[] }) => void;
    let resolveSearchB: (value: { files: DriveItem[] }) => void;

    const promiseA = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolveSearchA = resolve;
    });
    const promiseB = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolveSearchB = resolve;
    });

    const fetchSpy = vi
      .spyOn(driveApiService, 'fetchDriveFiles')
      // Carga inicial do root
      .mockResolvedValueOnce({ files: [] })
      // Pesquisa A (lenta)
      .mockImplementationOnce(() => promiseA)
      // Pesquisa B (rápida)
      .mockImplementationOnce(() => promiseB);

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
    });

    // Inicia pesquisa A
    act(() => {
      result.current.setSearchTerm('Alpha');
    });

    // Simula debounce disparando a pesquisa A imediatamente
    await act(async () => {
      // Como o timer no código real é 350ms, chamamos executeSearch indiretamente via timer
      await new Promise((r) => setTimeout(r, 400));
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ searchTerm: 'Alpha' })
    );

    // Inicia pesquisa B enquanto A está em voo
    act(() => {
      result.current.setSearchTerm('Beta');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ searchTerm: 'Beta' })
    );

    // Pesquisa B (a mais recente) resolve PRIMEIRO
    await act(async () => {
      resolveSearchB!({ files: [fileBeta] });
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
    });

    // Pesquisa A (obsoleta) resolve DEPOIS
    await act(async () => {
      resolveSearchA!({ files: [fileAlpha] });
    });

    // O resultado exibido DEVE permanecer sendo o de Beta! Alpha deve ter sido descartado
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
  });

  it('2. Navegação da pasta A para B com requisição pendente: itens de B prevalecem', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    let resolveFolderA: (value: { files: DriveItem[] }) => void;
    let resolveFolderB: (value: { files: DriveItem[] }) => void;

    const promiseFolderA = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolveFolderA = resolve;
    });
    const promiseFolderB = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolveFolderB = resolve;
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles')
      // Root inicial
      .mockResolvedValueOnce({ files: [] })
      // Pasta A (lenta)
      .mockImplementationOnce(() => promiseFolderA)
      // Pasta B (rápida)
      .mockImplementationOnce(() => promiseFolderB);

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
    });

    // Navega para Pasta A
    act(() => {
      void result.current.navigateToFolder(folderA);
    });

    // Antes de A resolver, o usuário navega imediatamente para Pasta B
    act(() => {
      void result.current.navigateToFolder(folderB);
    });

    // Pasta B resolve primeiro
    await act(async () => {
      resolveFolderB!({ files: [fileBeta] });
    });

    await waitFor(() => {
      expect(result.current.currentFolder.id).toBe('folder_beta_id');
      expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
    });

    // Pasta A (antiga) resolve depois
    await act(async () => {
      resolveFolderA!({ files: [fileAlpha] });
    });

    // A resposta atrasada de A não deve substituir os itens de B
    expect(result.current.currentFolder.id).toBe('folder_beta_id');
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
  });

  it('3. Paginação antiga concluída depois de uma pesquisa nova: paginação descartada', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    let resolvePage2: (value: { files: DriveItem[] }) => void;
    const promisePage2 = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolvePage2 = resolve;
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles')
      // Root inicial com token de próxima página
      .mockResolvedValueOnce({
        files: [fileAlpha],
        nextPageToken: 'token_page_2',
      })
      // loadNextPage lento
      .mockImplementationOnce(() => promisePage2)
      // Busca nova que resolve imediatamente
      .mockResolvedValueOnce({
        files: [fileBeta],
      });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
      expect(result.current.nextPageToken).toBe('token_page_2');
    });

    // Dispara paginação da pasta raiz
    act(() => {
      void result.current.loadNextPage();
    });

    // Enquanto a paginação está pendente na rede, o usuário digita uma busca
    act(() => {
      result.current.setSearchTerm('Beta');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
    });

    // A página 2 da consulta antiga de pasta finalmente resolve
    await act(async () => {
      resolvePage2!({ files: [fileAlpha] });
    });

    // A paginação antiga não pode se anexar aos resultados da busca nova!
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
  });

  it('4. Cancelamento via AbortController sem erro visual indevido', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    const abortError = new DOMException(
      'The user aborted a request.',
      'AbortError'
    );

    vi.spyOn(driveApiService, 'fetchDriveFiles')
      .mockResolvedValueOnce({ files: [fileAlpha] })
      // Próxima chamada é cancelada
      .mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
    });

    // Dispara refresh que é abortado
    await act(async () => {
      void result.current.refresh();
    });

    // O status de erro NÃO deve ser definido quando a exceção for AbortError
    expect(result.current.syncState.error).toBeNull();
  });

  it('5. Requisições simultâneas sem duplicação de arquivos por ID canônico', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles')
      .mockResolvedValueOnce({
        files: [fileAlpha, fileBeta],
        nextPageToken: 'token_p2',
      })
      .mockResolvedValueOnce({
        // A página 2 contém fileAlpha novamente (duplicado da API)
        files: [fileAlpha, mockValidDriveFolder],
      });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    await act(async () => {
      await result.current.loadNextPage();
    });

    // Deve conter 3 itens no total: fileAlpha, fileBeta e mockValidDriveFolder (sem duplicar fileAlpha)
    expect(result.current.items).toHaveLength(3);
    const ids = result.current.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('6. Resposta obsoleta não sobrescreve nem polui o cache da pasta ativa', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    let resolveFolderA: (value: { files: DriveItem[] }) => void;
    const promiseFolderA = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolveFolderA = resolve;
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles')
      .mockResolvedValueOnce({ files: [] })
      // Pasta A lenta
      .mockImplementationOnce(() => promiseFolderA)
      // Pasta B rápida
      .mockResolvedValueOnce({ files: [fileBeta] });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
    });

    act(() => {
      void result.current.navigateToFolder(folderA);
    });

    act(() => {
      void result.current.navigateToFolder(folderB);
    });

    await waitFor(() => {
      expect(result.current.currentFolder.id).toBe('folder_beta_id');
      expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
    });

    // Cache da pasta B contém fileBeta
    expect(driveCache.get('folder_beta_id')?.items[0]?.id).toBe(
      'canonical_file_beta_id'
    );

    // Resposta atrasada de A resolve
    await act(async () => {
      resolveFolderA!({ files: [fileAlpha] });
    });

    // O cache da pasta B não foi tocado nem poluído
    expect(driveCache.get('folder_beta_id')?.items[0]?.id).toBe(
      'canonical_file_beta_id'
    );
  });

  it('7. Logout durante uma requisição em voo cancela e limpa estado sem erro', async () => {
    let authStatus = 'connected';
    const logoutMock = vi.fn(async () => {
      authStatus = 'disconnected';
    });

    vi.spyOn(authService, 'useAuth').mockImplementation(() => ({
      session: {
        status: authStatus as 'connected' | 'disconnected',
        userEmail: authStatus === 'connected' ? 'user@example.com' : undefined,
      },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: logoutMock,
      clearError: vi.fn(),
    }));

    let resolvePending: (value: { files: DriveItem[] }) => void;
    const promisePending = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolvePending = resolve;
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles')
      .mockResolvedValueOnce({ files: [fileAlpha] })
      .mockImplementationOnce(() => promisePending);

    const { result, rerender } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
    });

    // Dispara refresh que fica pendente
    act(() => {
      void result.current.refresh();
    });

    // Logout acionado pelo usuário
    act(() => {
      logoutMock();
      rerender();
    });

    // O estado deve estar desconectado e limpo
    expect(result.current.syncState.status).toBe('disconnected');
    expect(result.current.items).toHaveLength(0);
    expect(driveCache.get(ROOT_FOLDER.id)).toBeUndefined();

    // A requisição pendente resolve após o logout
    await act(async () => {
      resolvePending!({ files: [fileAlpha] });
    });

    // Deve permanecer desconectado e vazio!
    expect(result.current.syncState.status).toBe('disconnected');
    expect(result.current.items).toHaveLength(0);
  });

  it('8. Erros reais de API (HTTP 403 / 500) são preservados no syncState', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles').mockRejectedValueOnce({
      code: 'server_error',
      status: 500,
      message: 'Serviços do Google temporariamente indisponíveis (HTTP 500).',
    });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('error');
    });

    expect(result.current.syncState.error?.code).toBe('server_error');
    expect(result.current.syncState.error?.message).toContain('HTTP 500');
  });

  it('9. Pesquisa A pendente, usuário digita B e A resolve antes dos 350 ms: A não pode atualizar a interface', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    let resolveSearchA: (value: { files: DriveItem[] }) => void;
    let resolveSearchB: (value: { files: DriveItem[] }) => void;

    const promiseA = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolveSearchA = resolve;
    });
    const promiseB = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolveSearchB = resolve;
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles')
      // Carga inicial
      .mockResolvedValueOnce({ files: [] })
      // Pesquisa A
      .mockImplementationOnce(() => promiseA)
      // Pesquisa B
      .mockImplementationOnce(() => promiseB);

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
    });

    // Inicia pesquisa A e espera o debounce de A disparar o fetch
    act(() => {
      result.current.setSearchTerm('Alpha');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    // Agora a pesquisa A está pendente na rede.
    // O usuário digita 'Beta' (B), acionando setSearchTerm('Beta')
    act(() => {
      result.current.setSearchTerm('Beta');
    });

    // Neste momento, estamos dentro da janela de 350ms do debounce de B.
    // A pesquisa A (obsoleta) resolve ANTES dos 350ms estourarem!
    await act(async () => {
      resolveSearchA!({ files: [fileAlpha] });
    });

    // A resposta de A NÃO PODE atualizar a interface nem a lista de itens!
    expect(result.current.items).toHaveLength(0);

    // Agora o timer de B estoura (350ms) e dispara o fetch de B
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    // Pesquisa B resolve com os dados de Beta
    await act(async () => {
      resolveSearchB!({ files: [fileBeta] });
    });

    // Somente os dados de Beta são apresentados na interface
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
  });

  it('10. Paginação pendente cancelada por nova pesquisa: isLoadingMore deve voltar a false imediatamente', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    let resolvePagination: (value: { files: DriveItem[] }) => void;
    const paginationPromise = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolvePagination = resolve;
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles')
      // Carga inicial com token de paginação
      .mockResolvedValueOnce({
        files: [fileAlpha],
        nextPageToken: 'token_p2',
      })
      // Paginação pendente
      .mockImplementationOnce(() => paginationPromise)
      // Nova pesquisa
      .mockResolvedValueOnce({
        files: [fileBeta],
      });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    // Inicia paginação
    act(() => {
      void result.current.loadNextPage();
    });

    expect(result.current.isLoadingMore).toBe(true);

    // Usuário digita nova pesquisa enquanto a paginação está pendente
    act(() => {
      result.current.setSearchTerm('Beta');
    });

    // isLoadingMore DEVE voltar a false imediatamente!
    expect(result.current.isLoadingMore).toBe(false);

    // Resolve a paginação pendente defasada
    await act(async () => {
      resolvePagination!({ files: [fileAlpha] });
    });

    // isLoadingMore continua false e não anexa nada
    expect(result.current.isLoadingMore).toBe(false);

    // Avança o timer do debounce da nova pesquisa
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
    });
  });

  it('11. Navegação durante paginação: resultados da pasta anterior não podem ser anexados', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    let resolveOldPage: (value: { files: DriveItem[] }) => void;
    const oldPagePromise = new Promise<{ files: DriveItem[] }>((resolve) => {
      resolveOldPage = resolve;
    });

    const extraFileRoot: DriveItem = {
      ...mockValidDriveFile,
      id: 'root_extra_file_p2',
      name: 'Arquivo Antigo da Raiz.pdf',
    };

    vi.spyOn(driveApiService, 'fetchDriveFiles')
      // Raiz inicial
      .mockResolvedValueOnce({
        files: [fileAlpha],
        nextPageToken: 'token_page_root_2',
      })
      // Paginação da raiz pendente
      .mockImplementationOnce(() => oldPagePromise)
      // Navegação para a Pasta B
      .mockResolvedValueOnce({
        files: [fileBeta],
      });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
    });

    // Inicia paginação na pasta raiz
    act(() => {
      void result.current.loadNextPage();
    });

    expect(result.current.isLoadingMore).toBe(true);

    // Usuário navega para a Pasta B enquanto a página 2 da raiz está pendente
    act(() => {
      void result.current.navigateToFolder(folderB);
    });

    // isLoadingMore é resetado imediatamente e a pasta atual muda para Pasta B
    expect(result.current.isLoadingMore).toBe(false);
    expect(result.current.currentFolder.id).toBe('folder_beta_id');

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
    });

    // Agora a página 2 da pasta raiz antiga resolve
    await act(async () => {
      resolveOldPage!({ files: [extraFileRoot] });
    });

    // Os itens da pasta anterior NÃO PODEM ser anexados à Pasta B!
    expect(result.current.currentFolder.id).toBe('folder_beta_id');
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
  });

  it('12. Cancelamento seguido de nova requisição: a nova requisição deve atualizar normalmente', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'user@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles')
      // Carga inicial
      .mockResolvedValueOnce({ files: [fileAlpha] })
      // Requisição cancelada
      .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
      // Nova requisição bem-sucedida
      .mockResolvedValueOnce({
        files: [fileBeta],
        nextPageToken: 'token_beta_next',
      });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
      expect(result.current.items[0]?.id).toBe('canonical_file_alpha_id');
    });

    // Dispara refresh que é cancelado
    act(() => {
      void result.current.refresh();
    });

    // Imediatamente dispara nova busca legítima
    act(() => {
      result.current.setSearchTerm('Beta');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    // A nova requisição deve processar com total normalidade
    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]?.id).toBe('canonical_file_beta_id');
      expect(result.current.nextPageToken).toBe('token_beta_next');
      expect(result.current.syncState.error).toBeNull();
    });
  });
});
