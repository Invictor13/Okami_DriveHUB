/**
 * Componente Navegador do Google Drive (Explorer) — Okami DriveHUB
 *
 * Apresenta arquivos, pastas e atalhos reais retornados pela Google Drive API v3.
 * Suporta busca por nome com debounce, filtros por tipo MIME, modos de visualização
 * (Grade e Lista Compacta), ordenação dinâmica e paginação contínua.
 *
 * REGRAS INEGOCIÁVEIS:
 * - Operações estritamente de LEITURA.
 * - Todos os dados exibidos pertencem à conta real conectada.
 * - Zero dados fictícios ou mocks de fallback.
 */

import { type FC, useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  CornerDownRight,
  ExternalLink,
  RotateCcw,
  ChevronRight,
  AlertCircle,
  Loader2,
  Clock,
  Search,
  X,
  LayoutGrid,
  List,
  ArrowUpDown,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { DriveItemKind } from '@/types/drive';
import { useDriveFiles } from '@/services/drive/useDriveFiles';
import {
  isDriveFolder,
  isDriveShortcut,
  resolveItemKind,
} from '@/utils/validators';
import { formatBytes } from '@/utils/formatters';
import { sanitizeFileName, sanitizeUrl } from '@/utils/sanitizers';
import { Badge } from '@/components/common/Badge';
import {
  FileTypeFilter,
  SortOption,
  ViewMode,
  FILTER_OPTIONS,
  getKindLabel,
  filterDriveItem,
  sortDriveItems,
} from './driveExplorerUtils';

/**
 * Retorna o ícone temático apropriado para a categoria do item
 */
function renderItemIcon(kind: DriveItemKind) {
  switch (kind) {
    case 'folder':
      return <Folder className="h-5 w-5 text-nintendo-cyan" />;
    case 'shortcut':
      return <CornerDownRight className="h-5 w-5 text-amber-400" />;
    case 'document':
      return <FileText className="h-5 w-5 text-blue-400" />;
    case 'spreadsheet':
      return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
    case 'presentation':
      return <FileText className="h-5 w-5 text-amber-500" />;
    case 'pdf':
      return <FileText className="h-5 w-5 text-rose-400" />;
    case 'image':
      return <FileImage className="h-5 w-5 text-purple-400" />;
    case 'video':
      return <FileVideo className="h-5 w-5 text-pink-400" />;
    case 'audio':
      return <FileAudio className="h-5 w-5 text-teal-400" />;
    default:
      return <File className="h-5 w-5 text-slate-400" />;
  }
}

export const DriveExplorer: FC = () => {
  const {
    items,
    syncState,
    folderStack,
    nextPageToken,
    isLoadingMore,
    searchTerm = '',
    isSearching = false,
    restrictToFolder = true,
    setSearchTerm = () => {},
    setRestrictToFolder = () => {},
    clearSearch = () => {},
    navigateToFolder,
    navigateToBreadcrumb,
    loadNextPage,
    refresh,
  } = useDriveFiles();

  // Estados locais de interface (não disparam requisições à API)
  const [activeFilter, setActiveFilter] = useState<FileTypeFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const isInitialLoading = syncState.status === 'loading' && items.length === 0;

  // Filtragem e ordenação reativas dos itens carregados
  const filteredAndSortedItems = useMemo(() => {
    const filtered = items.filter((item) =>
      filterDriveItem(item, activeFilter)
    );
    return sortDriveItems(filtered, sortOption);
  }, [items, activeFilter, sortOption]);

  return (
    <section
      aria-label="Explorador de Arquivos do Google Drive"
      className="glass-pill mt-6 flex w-full max-w-5xl flex-col rounded-3xl p-4 sm:p-6"
    >
      {/* Barra Superior do Explorer: Breadcrumb e Sincronização */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        {/* Trilha de Navegação (Breadcrumb) */}
        <div className="flex flex-col gap-1">
          <nav
            aria-label="Trilha de pastas"
            className="flex flex-wrap items-center gap-1.5 text-xs font-semibold"
          >
            {folderStack.map((crumb, idx) => {
              const isLast = idx === folderStack.length - 1;
              return (
                <div key={crumb.id} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                  )}
                  <button
                    type="button"
                    onClick={() => void navigateToBreadcrumb(idx)}
                    disabled={isLast || syncState.status === 'loading'}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                      isLast
                        ? 'bg-nintendo-cyan/15 text-nintendo-cyan'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    {idx === 0 ? (
                      <FolderOpen className="h-3.5 w-3.5" />
                    ) : (
                      <Folder className="h-3.5 w-3.5" />
                    )}
                    <span>{sanitizeFileName(crumb.name)}</span>
                  </button>
                </div>
              );
            })}
          </nav>
          {/* Informação sobre escopo do Meu Drive */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Info className="h-3 w-3 text-nintendo-cyan" />
            <span>
              Meu Drive (unidades compartilhadas acessíveis via busca ou
              atalhos)
            </span>
          </div>
        </div>

        {/* Status de Sincronização e Botão Atualizar */}
        <div className="flex items-center gap-2">
          {syncState.status === 'syncing' && (
            <Badge variant="cyan" className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Sincronizando...</span>
            </Badge>
          )}

          {syncState.status === 'synchronized' && (
            <Badge variant="emerald" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Sincronizado</span>
            </Badge>
          )}

          {syncState.status === 'error' && (
            <Badge variant="rose" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Erro</span>
            </Badge>
          )}

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={
              syncState.status === 'loading' || syncState.status === 'syncing'
            }
            title="Atualizar pasta atual"
            className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RotateCcw
              className={`h-4 w-4 ${
                syncState.status === 'syncing' ? 'animate-spin' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Barra de Ferramentas: Busca, Ordenação e Modos de Visualização */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {/* Campo de Pesquisa em Tempo Real com Debounce */}
        <div className="relative flex min-w-[260px] max-w-md flex-1 items-center">
          {isSearching ? (
            <Loader2 className="absolute left-3 h-4 w-4 animate-spin text-nintendo-cyan" />
          ) : (
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
          )}
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar arquivos por nome..."
            aria-label="Buscar arquivos por nome"
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-2 pl-9 pr-8 text-xs text-slate-100 placeholder-slate-400 focus:border-nintendo-cyan focus:outline-none focus:ring-1 focus:ring-nintendo-cyan"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              title="Limpar busca"
              aria-label="Limpar busca"
              className="absolute right-2.5 rounded p-0.5 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Controles de Restrição de Busca, Ordenação e Visualização */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle de Restrição à Pasta Atual */}
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10">
            <input
              type="checkbox"
              checked={restrictToFolder}
              onChange={(e) => setRestrictToFolder(e.target.checked)}
              className="rounded border-white/20 bg-slate-900 text-nintendo-cyan focus:ring-0"
            />
            <span className="text-[11px] font-medium">Nesta pasta</span>
          </label>

          {/* Seletor de Ordenação Dinâmica */}
          <div className="relative flex items-center">
            <label htmlFor="sort-select" className="sr-only">
              Ordenar por
            </label>
            <ArrowUpDown className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
            <select
              id="sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              aria-label="Ordenar por"
              className="cursor-pointer appearance-none rounded-xl border border-white/10 bg-slate-900/60 py-1.5 pl-8 pr-7 text-xs font-medium text-slate-200 focus:border-nintendo-cyan focus:outline-none"
            >
              <option value="name_asc">Nome (A - Z)</option>
              <option value="name_desc">Nome (Z - A)</option>
              <option value="date_desc">Mais recente</option>
              <option value="date_asc">Mais antigo</option>
              <option value="size_asc">Menor tamanho</option>
              <option value="size_desc">Maior tamanho</option>
            </select>
          </div>

          {/* Alternador de Modo de Visualização (Grade vs Lista Compacta) */}
          <div className="flex items-center rounded-xl border border-white/10 bg-slate-900/60 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Visualização em grade"
              title="Visualização em Grade"
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-nintendo-cyan/20 text-nintendo-cyan'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="Visualização em lista compacta"
              title="Visualização em Lista Compacta"
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-nintendo-cyan/20 text-nintendo-cyan'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Chips de Filtro por Tipo de Arquivo */}
      <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
          <SlidersHorizontal className="h-3 w-3" />
          Filtros:
        </span>
        {FILTER_OPTIONS.map((opt) => {
          const isActive = activeFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setActiveFilter(opt.id)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-nintendo-cyan text-slate-950 shadow-sm shadow-nintendo-cyan/20'
                  : 'border border-white/5 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Mensagem de Erro com Botão de Tentativa */}
      {syncState.status === 'error' && syncState.error && (
        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-200">
          <div className="flex items-center gap-2 font-semibold text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <h4 className="text-xs font-semibold">
              Falha ao consultar o Google Drive
            </h4>
          </div>
          <p className="text-slate-300">{syncState.error.message}</p>
          {syncState.error.retryable && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Indicador de Carregamento Inicial (Skeleton) */}
      {isInitialLoading && (
        <div
          data-testid="drive-loading-skeleton"
          className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex h-24 animate-pulse flex-col justify-between rounded-2xl border border-white/5 bg-white/5 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-white/10" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded bg-white/10" />
                  <div className="h-2 w-1/2 rounded bg-white/5" />
                </div>
              </div>
              <div className="h-2 w-1/3 rounded bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {/* Estado Vazio: Nenhum arquivo na pasta ou nenhum resultado na busca */}
      {!isInitialLoading &&
        syncState.status !== 'error' &&
        filteredAndSortedItems.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500">
              {searchTerm ? (
                <Search className="h-8 w-8 text-slate-400" />
              ) : (
                <Folder className="h-8 w-8 text-slate-500" />
              )}
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-200">
              {searchTerm
                ? 'Nenhum resultado encontrado'
                : 'Esta pasta está vazia'}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              {searchTerm
                ? `Nenhum arquivo correspondeu aos critérios de busca por "${searchTerm}".`
                : 'Nenhum arquivo ou subpasta encontrado nesta localização do seu Google Drive.'}
            </p>
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="mt-4 rounded-xl border border-nintendo-cyan/30 bg-nintendo-cyan/10 px-3.5 py-1.5 text-xs font-semibold text-nintendo-cyan transition-colors hover:bg-nintendo-cyan/20"
              >
                Limpar busca
              </button>
            )}
          </div>
        )}

      {/* Listagem de Itens no Modo Grade (Cards) */}
      {!isInitialLoading &&
        viewMode === 'grid' &&
        filteredAndSortedItems.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {filteredAndSortedItems.map((item) => {
              const isFolder = isDriveFolder(item);
              const isShortcut = isDriveShortcut(item);
              const kind = resolveItemKind(item.mimeType, item.name);
              const cleanName = sanitizeFileName(item.name);
              const safeWebLink = sanitizeUrl(item.webViewLink);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isFolder) {
                      void navigateToFolder({ id: item.id, name: item.name });
                    }
                  }}
                  onDoubleClick={() => {
                    if (isFolder) {
                      void navigateToFolder({ id: item.id, name: item.name });
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${isFolder ? 'Pasta' : 'Arquivo'}: ${cleanName}`}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && isFolder) {
                      e.preventDefault();
                      void navigateToFolder({ id: item.id, name: item.name });
                    }
                  }}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
                    isFolder
                      ? 'cursor-pointer border-nintendo-cyan/20 bg-nintendo-cyan/5 hover:border-nintendo-cyan/40 hover:bg-nintendo-cyan/10'
                      : 'border-white/5 bg-white/5 hover:border-white/15 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900/60">
                        {renderItemIcon(kind)}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span
                          className="truncate text-xs font-semibold text-slate-100 group-hover:text-white"
                          title={cleanName}
                        >
                          {cleanName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          {isShortcut && <Badge variant="cyan">Atalho</Badge>}
                          <span>
                            {item.modifiedTime
                              ? new Date(item.modifiedTime).toLocaleDateString(
                                  'pt-BR'
                                )
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações: Link Externo ou Indicador de Pasta */}
                    {safeWebLink && !isFolder && (
                      <a
                        href={safeWebLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir no Google Drive"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Rodapé do Card */}
                  <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-slate-400">
                    <span>{isFolder ? 'Pasta' : formatBytes(item.size)}</span>
                    {isFolder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void navigateToFolder({
                            id: item.id,
                            name: item.name,
                          });
                        }}
                        className="font-medium text-nintendo-cyan hover:underline"
                      >
                        Abrir
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* Listagem de Itens no Modo Lista Compacta (Tabela) */}
      {!isInitialLoading &&
        viewMode === 'list' &&
        filteredAndSortedItems.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Nome
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Modificado em
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Tamanho
                  </th>
                  <th scope="col" className="px-4 py-3 text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAndSortedItems.map((item) => {
                  const isFolder = isDriveFolder(item);
                  const isShortcut = isDriveShortcut(item);
                  const kind = resolveItemKind(item.mimeType, item.name);
                  const cleanName = sanitizeFileName(item.name);
                  const safeWebLink = sanitizeUrl(item.webViewLink);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (isFolder) {
                          void navigateToFolder({
                            id: item.id,
                            name: item.name,
                          });
                        }
                      }}
                      className={`transition-colors ${
                        isFolder
                          ? 'cursor-pointer hover:bg-nintendo-cyan/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Nome e Ícone */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="shrink-0">{renderItemIcon(kind)}</div>
                          <span
                            className="max-w-[280px] truncate font-medium text-slate-100 sm:max-w-md"
                            title={cleanName}
                          >
                            {cleanName}
                          </span>
                          {isShortcut && <Badge variant="cyan">Atalho</Badge>}
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-2.5 text-slate-400">
                        {getKindLabel(kind)}
                      </td>

                      {/* Data de Modificação */}
                      <td className="px-4 py-2.5 text-slate-400">
                        {item.modifiedTime
                          ? new Date(item.modifiedTime).toLocaleDateString(
                              'pt-BR'
                            )
                          : '—'}
                      </td>

                      {/* Tamanho */}
                      <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                        {isFolder ? '—' : formatBytes(item.size)}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-2.5 text-center">
                        {safeWebLink && (
                          <a
                            href={safeWebLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir no Google Drive"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Paginação e Contador de Itens */}
      {!isInitialLoading && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-400">
          <div>
            <span>
              {filteredAndSortedItems.length} item(s) exibido(s) de{' '}
              {items.length} item(s) reais
            </span>
          </div>

          {nextPageToken && (
            <button
              type="button"
              onClick={() => void loadNextPage()}
              disabled={isLoadingMore}
              className="flex items-center gap-2 rounded-xl border border-nintendo-cyan/30 bg-nintendo-cyan/10 px-4 py-2 font-semibold text-nintendo-cyan transition-all hover:bg-nintendo-cyan/20 disabled:opacity-50"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Carregando mais...</span>
                </>
              ) : (
                <span>Carregar mais arquivos</span>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
};
