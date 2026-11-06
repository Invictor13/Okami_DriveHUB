import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DriveExplorer } from '@/components/explorer/DriveExplorer';
import * as useDriveFilesModule from '@/services/drive/useDriveFiles';
import {
  mockValidDriveFile,
  mockValidDriveFolder,
  mockValidDriveShortcut,
} from '../mocks/driveMocks';

describe('DriveExplorer — Interface do Explorador de Arquivos Reais (PR05)', () => {
  const mockNavigateToFolder = vi.fn();
  const mockNavigateToBreadcrumb = vi.fn();
  const mockLoadNextPage = vi.fn();
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza o estado honesto de pasta vazia quando o Drive não possui arquivos', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue({
      items: [],
      syncState: {
        status: 'synchronized',
        lastSyncedAt: '2026-11-06T12:00:00Z',
        itemCount: 0,
        error: null,
      },
      currentFolder: { id: 'root', name: 'Meu Google Drive' },
      folderStack: [{ id: 'root', name: 'Meu Google Drive' }],
      nextPageToken: undefined,
      isLoadingMore: false,
      navigateToFolder: mockNavigateToFolder,
      navigateUp: vi.fn(),
      navigateToBreadcrumb: mockNavigateToBreadcrumb,
      loadNextPage: mockLoadNextPage,
      refresh: mockRefresh,
    });

    render(<DriveExplorer />);

    expect(
      screen.getByRole('heading', { name: /Esta pasta está vazia/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nenhum arquivo ou subpasta encontrado/i)
    ).toBeInTheDocument();
    expect(screen.getByText('0 item(s) reais')).toBeInTheDocument();
  });

  it('renderiza arquivos, pastas e atalhos reais com seus metadados autênticos', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue({
      items: [mockValidDriveFile, mockValidDriveFolder, mockValidDriveShortcut],
      syncState: {
        status: 'synchronized',
        lastSyncedAt: '2026-11-06T12:00:00Z',
        itemCount: 3,
        error: null,
      },
      currentFolder: { id: 'root', name: 'Meu Google Drive' },
      folderStack: [{ id: 'root', name: 'Meu Google Drive' }],
      nextPageToken: undefined,
      isLoadingMore: false,
      navigateToFolder: mockNavigateToFolder,
      navigateUp: vi.fn(),
      navigateToBreadcrumb: mockNavigateToBreadcrumb,
      loadNextPage: mockLoadNextPage,
      refresh: mockRefresh,
    });

    render(<DriveExplorer />);

    // Nome real do arquivo
    expect(
      screen.getByText('Relatório Técnico de Auditoria 2026.pdf')
    ).toBeInTheDocument();
    // Tamanho formatado real (2 MB)
    expect(screen.getByText('2 MB')).toBeInTheDocument();

    // Pasta real
    expect(screen.getByText('Documentos Profissionais')).toBeInTheDocument();

    // Atalho real com badge
    expect(
      screen.getByText('Atalho para Planilha Financeira')
    ).toBeInTheDocument();
    expect(screen.getByText('Atalho')).toBeInTheDocument();

    // Contador real de itens
    expect(screen.getByText('3 item(s) reais')).toBeInTheDocument();
  });

  it('permite clicar em uma pasta real para navegar em profundidade', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue({
      items: [mockValidDriveFolder],
      syncState: {
        status: 'synchronized',
        lastSyncedAt: '2026-11-06T12:00:00Z',
        itemCount: 1,
        error: null,
      },
      currentFolder: { id: 'root', name: 'Meu Google Drive' },
      folderStack: [{ id: 'root', name: 'Meu Google Drive' }],
      nextPageToken: undefined,
      isLoadingMore: false,
      navigateToFolder: mockNavigateToFolder,
      navigateUp: vi.fn(),
      navigateToBreadcrumb: mockNavigateToBreadcrumb,
      loadNextPage: mockLoadNextPage,
      refresh: mockRefresh,
    });

    render(<DriveExplorer />);

    const folderButton = screen.getByRole('button', {
      name: /Documentos Profissionais/i,
    });
    fireEvent.click(folderButton);

    expect(mockNavigateToFolder).toHaveBeenCalledWith({
      id: mockValidDriveFolder.id,
      name: mockValidDriveFolder.name,
    });
  });

  it('exibe botão de paginação quando nextPageToken estiver presente e permite carregar mais', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue({
      items: [mockValidDriveFile],
      syncState: {
        status: 'synchronized',
        lastSyncedAt: '2026-11-06T12:00:00Z',
        itemCount: 1,
        error: null,
      },
      currentFolder: { id: 'root', name: 'Meu Google Drive' },
      folderStack: [{ id: 'root', name: 'Meu Google Drive' }],
      nextPageToken: 'token_pagina_2',
      isLoadingMore: false,
      navigateToFolder: mockNavigateToFolder,
      navigateUp: vi.fn(),
      navigateToBreadcrumb: mockNavigateToBreadcrumb,
      loadNextPage: mockLoadNextPage,
      refresh: mockRefresh,
    });

    render(<DriveExplorer />);

    const loadMoreBtn = screen.getByRole('button', {
      name: /Carregar mais arquivos/i,
    });
    expect(loadMoreBtn).toBeInTheDocument();

    fireEvent.click(loadMoreBtn);
    expect(mockLoadNextPage).toHaveBeenCalled();
  });

  it('apresenta mensagem de erro e botão de tentar novamente em caso de falha', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue({
      items: [],
      syncState: {
        status: 'error',
        lastSyncedAt: null,
        itemCount: 0,
        error: {
          code: 'network_error',
          message: 'Falha de conexão com os servidores do Google.',
          timestamp: '2026-11-06T12:00:00Z',
          retryable: true,
        },
      },
      currentFolder: { id: 'root', name: 'Meu Google Drive' },
      folderStack: [{ id: 'root', name: 'Meu Google Drive' }],
      nextPageToken: undefined,
      isLoadingMore: false,
      navigateToFolder: mockNavigateToFolder,
      navigateUp: vi.fn(),
      navigateToBreadcrumb: mockNavigateToBreadcrumb,
      loadNextPage: mockLoadNextPage,
      refresh: mockRefresh,
    });

    render(<DriveExplorer />);

    expect(
      screen.getByRole('heading', {
        name: /Falha ao consultar o Google Drive/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Falha de conexão com os servidores do Google/i)
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Tentar Novamente/i });
    fireEvent.click(retryBtn);
    expect(mockRefresh).toHaveBeenCalled();
  });
});
