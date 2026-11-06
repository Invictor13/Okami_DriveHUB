/**
 * Componente Navegador do Google Drive (Explorer) — Okami DriveHUB
 *
 * Apresenta arquivos, pastas e atalhos reais retornados pela Google Drive API v3.
 * Suporta navegação interativa em profundidade, paginação contínua e status de sincronização.
 */

import { type FC } from 'react';
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
  ChevronDown,
  AlertCircle,
  Loader2,
  Clock,
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
    navigateToFolder,
    navigateToBreadcrumb,
    loadNextPage,
    refresh,
  } = useDriveFiles();

  const isInitialLoading = syncState.status === 'loading' && items.length === 0;

  return (
    <section
      aria-label="Explorador de Arquivos do Google Drive"
      className="glass-pill mt-6 flex w-full max-w-5xl flex-col rounded-3xl p-4 sm:p-6"
    >
      {/* Barra Superior do Explorer: Breadcrumb e Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        {/* Trilha de Navegação (Breadcrumb) */}
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
                  className={`rounded-lg px-2.5 py-1 transition-all ${
                    isLast
                      ? 'bg-nintendo-cyan/15 font-bold text-nintendo-cyan ring-1 ring-nintendo-cyan/30'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {sanitizeFileName(crumb.name)}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Status de Sincronização e Ação de Recarregar */}
        <div className="flex items-center gap-2">
          <Badge
            variant={
              syncState.status === 'synchronized'
                ? 'emerald'
                : syncState.status === 'loading' ||
                    syncState.status === 'syncing'
                  ? 'amber'
                  : syncState.status === 'error'
                    ? 'rose'
                    : 'slate'
            }
          >
            {syncState.status === 'loading' ||
            syncState.status === 'syncing' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            )}
            <span>
              {syncState.status === 'synchronized'
                ? `${syncState.itemCount} item(s) reais`
                : syncState.status === 'syncing'
                  ? 'Sincronizando...'
                  : syncState.status === 'loading'
                    ? 'Carregando...'
                    : syncState.status === 'error'
                      ? 'Falha na consulta'
                      : 'Pronto'}
            </span>
          </Badge>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={
              syncState.status === 'loading' || syncState.status === 'syncing'
            }
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition-all hover:bg-white/15 hover:text-white disabled:opacity-50"
            title="Atualizar listagem de arquivos do Google Drive"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 ${
                syncState.status === 'syncing'
                  ? 'animate-spin text-nintendo-cyan'
                  : ''
              }`}
            />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal do Explorer */}
      <div className="min-h-[280px] py-4">
        {/* ESTADO 1: Carregamento Inicial (Skeleton) */}
        {isInitialLoading && (
          <div
            data-testid="drive-loading-skeleton"
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3.5"
              >
                <div className="h-10 w-10 shrink-0 rounded-xl bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-white/10" />
                  <div className="h-2.5 w-1/2 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ESTADO 2: Erro na Consulta */}
        {!isInitialLoading &&
          syncState.status === 'error' &&
          syncState.error && (
            <div
              role="alert"
              className="flex flex-col items-center justify-center gap-3 py-10 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                Falha ao consultar o Google Drive
              </h3>
              <p className="max-w-md text-xs leading-relaxed text-slate-400">
                {syncState.error.message}
              </p>
              {syncState.error.retryable && (
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/20"
                >
                  Tentar Novamente
                </button>
              )}
            </div>
          )}

        {/* ESTADO 3: Pasta Vazia Legítima */}
        {!isInitialLoading &&
          syncState.status !== 'error' &&
          items.length === 0 && (
            <div
              data-testid="drive-empty-state"
              className="flex flex-col items-center justify-center gap-2 py-12 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
                <FolderOpen className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                Esta pasta está vazia
              </h3>
              <p className="max-w-xs text-xs text-slate-400">
                Nenhum arquivo ou subpasta encontrado neste diretório do Google
                Drive.
              </p>
            </div>
          )}

        {/* ESTADO 4: Listagem Real de Itens */}
        {!isInitialLoading && items.length > 0 && (
          <div
            data-testid="drive-items-grid"
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((item) => {
              const isFolder = isDriveFolder(item);
              const isShortcut = isDriveShortcut(item);
              const kind = resolveItemKind(item.mimeType, item.name);
              const safeName = sanitizeFileName(item.name);
              const formattedDate = item.modifiedTime
                ? new Date(item.modifiedTime).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : null;
              const safeLink = item.webViewLink
                ? sanitizeUrl(item.webViewLink)
                : null;

              if (isFolder) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      void navigateToFolder({ id: item.id, name: item.name })
                    }
                    className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-left transition-all hover:border-nintendo-cyan/50 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-nintendo-cyan/5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nintendo-cyan/15 text-nintendo-cyan ring-1 ring-nintendo-cyan/30">
                        <Folder className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-white group-hover:text-nintendo-cyan">
                          {safeName}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] text-slate-400">
                          <span>Pasta</span>
                          {formattedDate && (
                            <>
                              <span>•</span>
                              <span>{formattedDate}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </button>
                );
              }

              return (
                <div
                  key={item.id}
                  className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-left transition-all hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                      {renderItemIcon(kind)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-200 group-hover:text-white">
                        {safeName}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-slate-400">
                        {isShortcut && (
                          <span className="rounded bg-amber-400/20 px-1 text-amber-300">
                            Atalho
                          </span>
                        )}
                        <span>{formatBytes(item.size)}</span>
                        {formattedDate && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5 opacity-60" />
                              {formattedDate}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {safeLink && (
                    <a
                      href={safeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-70 transition-all hover:bg-white/10 hover:text-white hover:opacity-100"
                      title="Abrir no Google Drive"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Paginação: Carregar mais arquivos */}
      {nextPageToken && !isInitialLoading && (
        <div className="mt-3 flex justify-center border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => void loadNextPage()}
            disabled={isLoadingMore}
            className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-2.5 text-xs font-bold text-white transition-all hover:border-nintendo-cyan hover:bg-nintendo-cyan/20 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin text-nintendo-cyan" />
            ) : (
              <ChevronDown className="h-4 w-4 text-nintendo-cyan" />
            )}
            <span>
              {isLoadingMore
                ? 'Carregando mais itens...'
                : 'Carregar mais arquivos'}
            </span>
          </button>
        </div>
      )}
    </section>
  );
};
