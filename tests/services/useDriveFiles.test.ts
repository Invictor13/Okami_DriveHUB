import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDriveFiles } from '@/services/drive/useDriveFiles';
import * as driveApiService from '@/services/drive/driveApiService';
import * as authService from '@/services/auth';
import { mockValidDriveFile, mockValidDriveFolder } from '../mocks/driveMocks';

describe('useDriveFiles — Hook de Gerenciamento e Navegação do Drive (PR05)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('permanece no estado disconnected e lista vazia se a sessão estiver desconectada', () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'disconnected' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    const { result } = renderHook(() => useDriveFiles());

    expect(result.current.syncState.status).toBe('disconnected');
    expect(result.current.items).toHaveLength(0);
    expect(result.current.currentFolder.id).toBe('root');
  });

  it('carrega automaticamente os arquivos da pasta raiz ao detectar sessão conectada', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'test@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles').mockResolvedValueOnce({
      files: [mockValidDriveFile, mockValidDriveFolder],
      nextPageToken: 'next_page_123',
    });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.syncState.itemCount).toBe(2);
    expect(result.current.nextPageToken).toBe('next_page_123');
  });

  it('carrega a próxima página anexando novos itens sem duplicar IDs canônicos', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected', userEmail: 'test@example.com' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    // Primeira página
    vi.spyOn(driveApiService, 'fetchDriveFiles')
      .mockResolvedValueOnce({
        files: [mockValidDriveFile],
        nextPageToken: 'page_token_2',
      })
      // Segunda página (contém um item novo e repete o primeiro para testar deduplicação)
      .mockResolvedValueOnce({
        files: [mockValidDriveFile, mockValidDriveFolder],
        nextPageToken: undefined,
      });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
    });

    expect(result.current.items).toHaveLength(1);

    // Solicita a próxima página
    await act(async () => {
      await result.current.loadNextPage();
    });

    // Deve conter 2 itens (sem duplicar o mockValidDriveFile)
    expect(result.current.items).toHaveLength(2);
    expect(result.current.nextPageToken).toBeUndefined();
  });

  it('navega em profundidade para dentro de uma subpasta e atualiza o breadcrumb', async () => {
    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
    });

    const fetchSpy = vi
      .spyOn(driveApiService, 'fetchDriveFiles')
      .mockResolvedValue({
        files: [],
      });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('synchronized');
    });

    // Navega para a subpasta
    await act(async () => {
      await result.current.navigateToFolder({
        id: 'subfolder_id_456',
        name: 'Projetos 2026',
      });
    });

    expect(result.current.folderStack).toHaveLength(2);
    expect(result.current.currentFolder.id).toBe('subfolder_id_456');
    expect(result.current.currentFolder.name).toBe('Projetos 2026');

    expect(fetchSpy).toHaveBeenLastCalledWith({
      parentId: 'subfolder_id_456',
    });

    // Retorna para cima (navigateUp)
    await act(async () => {
      await result.current.navigateUp();
    });

    expect(result.current.folderStack).toHaveLength(1);
    expect(result.current.currentFolder.id).toBe('root');
  });

  it('trata erro de autenticação 401 acionando logout da sessão', async () => {
    const logoutMock = vi.fn();

    vi.spyOn(authService, 'useAuth').mockReturnValue({
      session: { status: 'connected' },
      error: null,
      isConfigured: true,
      login: vi.fn(),
      logout: logoutMock,
      clearError: vi.fn(),
    });

    vi.spyOn(driveApiService, 'fetchDriveFiles').mockRejectedValueOnce({
      code: 'unauthenticated',
      status: 401,
      message: 'Token expirado',
    });

    const { result } = renderHook(() => useDriveFiles());

    await waitFor(() => {
      expect(result.current.syncState.status).toBe('error');
    });

    expect(logoutMock).toHaveBeenCalled();
    expect(result.current.syncState.error?.code).toBe('unauthenticated');
  });
});
