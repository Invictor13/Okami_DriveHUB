import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DriveExplorer } from '@/components/explorer/DriveExplorer';
import {
  sortDriveItems,
  filterDriveItem,
} from '@/components/explorer/driveExplorerUtils';
import * as useDriveFilesModule from '@/services/drive/useDriveFiles';
import {
  mockValidDriveFile,
  mockValidDriveFolder,
  mockValidDriveShortcut,
} from '../mocks/driveMocks';

function createMockDriveFiles(
  overrides: Partial<useDriveFilesModule.UseDriveFilesReturn> = {}
): useDriveFilesModule.UseDriveFilesReturn {
  return {
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
    searchTerm: '',
    isSearching: false,
    restrictToFolder: true,
    setSearchTerm: vi.fn(),
    setRestrictToFolder: vi.fn(),
    clearSearch: vi.fn(),
    navigateToFolder: vi.fn(),
    navigateUp: vi.fn(),
    navigateToBreadcrumb: vi.fn(),
    loadNextPage: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  };
}

describe('DriveExplorer — Interface do Explorador de Arquivos Reais (PR05 / PR06)', () => {
  const mockNavigateToFolder = vi.fn();
  const mockLoadNextPage = vi.fn();
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza o estado honesto de pasta vazia quando o Drive não possui arquivos', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue(
      createMockDriveFiles({
        items: [],
        currentFolder: { id: 'root', name: 'Meu Google Drive' },
        folderStack: [{ id: 'root', name: 'Meu Google Drive' }],
      })
    );

    render(<DriveExplorer />);

    expect(
      screen.getByRole('heading', { name: /Esta pasta está vazia/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nenhum arquivo ou subpasta encontrado/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/0 item\(s\) reais/i)).toBeInTheDocument();
  });

  it('renderiza arquivos, pastas e atalhos reais com seus metadados autênticos', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue(
      createMockDriveFiles({
        items: [
          mockValidDriveFile,
          mockValidDriveFolder,
          mockValidDriveShortcut,
        ],
        syncState: {
          status: 'synchronized',
          lastSyncedAt: '2026-11-06T12:00:00Z',
          itemCount: 3,
          error: null,
        },
      })
    );

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
    expect(screen.getByText(/3 item\(s\) reais/i)).toBeInTheDocument();
  });

  it('permite clicar em uma pasta real para navegar em profundidade', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue(
      createMockDriveFiles({
        items: [mockValidDriveFolder],
        navigateToFolder: mockNavigateToFolder,
      })
    );

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
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue(
      createMockDriveFiles({
        items: [mockValidDriveFile],
        nextPageToken: 'token_pagina_2',
        loadNextPage: mockLoadNextPage,
      })
    );

    render(<DriveExplorer />);

    const loadMoreBtn = screen.getByRole('button', {
      name: /Carregar mais arquivos/i,
    });
    expect(loadMoreBtn).toBeInTheDocument();

    fireEvent.click(loadMoreBtn);
    expect(mockLoadNextPage).toHaveBeenCalled();
  });

  it('apresenta mensagem de erro e botão de tentar novamente em caso de falha', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue(
      createMockDriveFiles({
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
        refresh: mockRefresh,
      })
    );

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

  it('permite alternar entre os modos de visualização em Grade e Lista Compacta', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue(
      createMockDriveFiles({
        items: [mockValidDriveFile, mockValidDriveFolder],
      })
    );

    render(<DriveExplorer />);

    // Por padrão está no modo grade (sem elemento table)
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // Clica no botão de lista compacta
    const listBtn = screen.getByRole('button', {
      name: /Visualização em lista compacta/i,
    });
    fireEvent.click(listBtn);

    // Agora deve renderizar a tabela com os cabeçalhos
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Nome/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Tipo/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Modificado em/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Tamanho/i })
    ).toBeInTheDocument();

    // Volta para o modo grade
    const gridBtn = screen.getByRole('button', {
      name: /Visualização em grade/i,
    });
    fireEvent.click(gridBtn);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('filtra itens por categoria e restaura todos ao clicar em Todos', () => {
    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue(
      createMockDriveFiles({
        items: [mockValidDriveFile, mockValidDriveFolder],
      })
    );

    render(<DriveExplorer />);

    expect(
      screen.getByText('Relatório Técnico de Auditoria 2026.pdf')
    ).toBeInTheDocument();
    expect(screen.getByText('Documentos Profissionais')).toBeInTheDocument();

    // Clica no chip "Pastas"
    const foldersFilterBtn = screen.getByRole('button', { name: /^Pastas$/i });
    fireEvent.click(foldersFilterBtn);

    // Apenas a pasta deve estar visível
    expect(screen.getByText('Documentos Profissionais')).toBeInTheDocument();
    expect(
      screen.queryByText('Relatório Técnico de Auditoria 2026.pdf')
    ).not.toBeInTheDocument();

    // Clica em "Todos"
    const allFilterBtn = screen.getByRole('button', { name: /^Todos$/i });
    fireEvent.click(allFilterBtn);

    // Ambos voltam a estar visíveis
    expect(
      screen.getByText('Relatório Técnico de Auditoria 2026.pdf')
    ).toBeInTheDocument();
    expect(screen.getByText('Documentos Profissionais')).toBeInTheDocument();
  });

  it('permite buscar arquivos por nome e limpar a busca', () => {
    const mockSetSearchTerm = vi.fn();
    const mockClearSearch = vi.fn();

    vi.spyOn(useDriveFilesModule, 'useDriveFiles').mockReturnValue(
      createMockDriveFiles({
        items: [mockValidDriveFile],
        searchTerm: 'auditoria',
        isSearching: false,
        setSearchTerm: mockSetSearchTerm,
        clearSearch: mockClearSearch,
      })
    );

    render(<DriveExplorer />);

    const searchInput = screen.getByLabelText(/Buscar arquivos por nome/i);
    expect(searchInput).toHaveValue('auditoria');

    fireEvent.change(searchInput, { target: { value: 'financeiro' } });
    expect(mockSetSearchTerm).toHaveBeenCalledWith('financeiro');

    const clearBtn = screen.getByRole('button', { name: /Limpar busca/i });
    fireEvent.click(clearBtn);
    expect(mockClearSearch).toHaveBeenCalled();
  });

  describe('Funções Puras de Ordenação e Filtragem (PR06)', () => {
    it('agrupa pastas antes de arquivos em qualquer modo de ordenação', () => {
      const items = [
        { ...mockValidDriveFile, name: 'Z_Arquivo.pdf' },
        { ...mockValidDriveFolder, name: 'A_Pasta' },
      ];

      const sorted = sortDriveItems(items, 'name_desc');
      expect(sorted[0]?.name).toBe('A_Pasta');
      expect(sorted[1]?.name).toBe('Z_Arquivo.pdf');
    });

    it('ordena arquivos por tamanho crescente e decrescente tratando itens sem tamanho', () => {
      const smallFile = {
        ...mockValidDriveFile,
        id: '1',
        name: 'pequeno.pdf',
        size: '1024',
      };
      const largeFile = {
        ...mockValidDriveFile,
        id: '2',
        name: 'grande.pdf',
        size: '10485760',
      };
      const noSizeFile = {
        ...mockValidDriveFile,
        id: '3',
        name: 'sem_tamanho.doc',
        size: undefined,
      };

      // Crescente: pequeno -> grande -> sem tamanho no final
      const asc = sortDriveItems(
        [largeFile, noSizeFile, smallFile],
        'size_asc'
      );
      expect(asc[0]?.id).toBe('1');
      expect(asc[1]?.id).toBe('2');
      expect(asc[2]?.id).toBe('3');

      // Decrescente: grande -> pequeno -> sem tamanho no final
      const desc = sortDriveItems(
        [smallFile, noSizeFile, largeFile],
        'size_desc'
      );
      expect(desc[0]?.id).toBe('2');
      expect(desc[1]?.id).toBe('1');
      expect(desc[2]?.id).toBe('3');
    });

    it('filtra arquivos corretamente por categoria MIME sem falsos positivos', () => {
      const pdfItem = mockValidDriveFile; // application/pdf
      const folderItem = mockValidDriveFolder; // application/vnd.google-apps.folder
      const imageItem = {
        ...mockValidDriveFile,
        id: 'img_1',
        mimeType: 'image/png',
      };

      expect(filterDriveItem(pdfItem, 'pdf')).toBe(true);
      expect(filterDriveItem(pdfItem, 'images')).toBe(false);

      expect(filterDriveItem(folderItem, 'folders')).toBe(true);
      expect(filterDriveItem(folderItem, 'pdf')).toBe(false);

      expect(filterDriveItem(imageItem, 'images')).toBe(true);
      expect(filterDriveItem(imageItem, 'others')).toBe(false);
    });
  });
});
