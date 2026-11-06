/**
 * Utilitários de Ordenação e Filtragem do Explorer — Okami DriveHUB
 *
 * Funções puras e desacopladas para manipulação e ordenação dos arquivos do Google Drive.
 */

import { DriveItem, DriveItemKind } from '@/types/drive';
import { isDriveFolder } from '@/utils/validators';

export type FileTypeFilter =
  | 'all'
  | 'folders'
  | 'documents'
  | 'spreadsheets'
  | 'presentations'
  | 'images'
  | 'videos'
  | 'audio'
  | 'pdf'
  | 'others';

export type SortOption =
  | 'name_asc'
  | 'name_desc'
  | 'date_desc'
  | 'date_asc'
  | 'size_asc'
  | 'size_desc';

export type ViewMode = 'grid' | 'list';

export const FILTER_OPTIONS: { id: FileTypeFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'folders', label: 'Pastas' },
  { id: 'documents', label: 'Documentos' },
  { id: 'spreadsheets', label: 'Planilhas' },
  { id: 'presentations', label: 'Apresentações' },
  { id: 'images', label: 'Imagens' },
  { id: 'videos', label: 'Vídeos' },
  { id: 'audio', label: 'Áudios' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'others', label: 'Outros' },
];

/**
 * Rótulo legível para o tipo de arquivo
 */
export function getKindLabel(kind: DriveItemKind): string {
  switch (kind) {
    case 'folder':
      return 'Pasta';
    case 'shortcut':
      return 'Atalho';
    case 'document':
      return 'Documento';
    case 'spreadsheet':
      return 'Planilha';
    case 'presentation':
      return 'Apresentação';
    case 'pdf':
      return 'PDF';
    case 'image':
      return 'Imagem';
    case 'video':
      return 'Vídeo';
    case 'audio':
      return 'Áudio';
    default:
      return 'Arquivo';
  }
}

/**
 * Filtra itens conforme categoria selecionada
 */
export function filterDriveItem(
  item: DriveItem,
  filter: FileTypeFilter
): boolean {
  if (filter === 'all') return true;
  const mime = item.mimeType;

  if (filter === 'folders') {
    return isDriveFolder(item);
  }
  if (filter === 'documents') {
    return (
      mime === 'application/vnd.google-apps.document' ||
      mime === 'application/msword' ||
      mime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'text/plain'
    );
  }
  if (filter === 'spreadsheets') {
    return (
      mime === 'application/vnd.google-apps.spreadsheet' ||
      mime === 'application/vnd.ms-excel' ||
      mime ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mime === 'text/csv'
    );
  }
  if (filter === 'presentations') {
    return (
      mime === 'application/vnd.google-apps.presentation' ||
      mime === 'application/vnd.ms-powerpoint' ||
      mime ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
  }
  if (filter === 'images') {
    return mime.startsWith('image/');
  }
  if (filter === 'videos') {
    return mime.startsWith('video/');
  }
  if (filter === 'audio') {
    return mime.startsWith('audio/');
  }
  if (filter === 'pdf') {
    return mime === 'application/pdf';
  }
  if (filter === 'others') {
    return (
      !filterDriveItem(item, 'folders') &&
      !filterDriveItem(item, 'documents') &&
      !filterDriveItem(item, 'spreadsheets') &&
      !filterDriveItem(item, 'presentations') &&
      !filterDriveItem(item, 'images') &&
      !filterDriveItem(item, 'videos') &&
      !filterDriveItem(item, 'audio') &&
      !filterDriveItem(item, 'pdf')
    );
  }
  return true;
}

/**
 * Ordena itens mantendo pastas agrupadas no topo
 */
export function sortDriveItems(
  items: DriveItem[],
  sortOption: SortOption
): DriveItem[] {
  return [...items].sort((a, b) => {
    const isFolderA = isDriveFolder(a);
    const isFolderB = isDriveFolder(b);

    // Pastas sempre agrupadas no topo
    if (isFolderA && !isFolderB) return -1;
    if (!isFolderA && isFolderB) return 1;

    switch (sortOption) {
      case 'name_asc':
        return a.name.localeCompare(b.name, undefined, {
          sensitivity: 'base',
        });
      case 'name_desc':
        return b.name.localeCompare(a.name, undefined, {
          sensitivity: 'base',
        });
      case 'date_desc': {
        const timeA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
        const timeB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
        return timeB - timeA;
      }
      case 'date_asc': {
        const timeA = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
        const timeB = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
        return timeA - timeB;
      }
      case 'size_asc': {
        if (!a.size && !b.size) {
          return a.name.localeCompare(b.name);
        }
        if (!a.size) return 1;
        if (!b.size) return -1;
        const bA = BigInt(a.size);
        const bB = BigInt(b.size);
        if (bA === bB) return a.name.localeCompare(b.name);
        return bA < bB ? -1 : 1;
      }
      case 'size_desc': {
        if (!a.size && !b.size) {
          return a.name.localeCompare(b.name);
        }
        if (!a.size) return 1;
        if (!b.size) return -1;
        const bA = BigInt(a.size);
        const bB = BigInt(b.size);
        if (bA === bB) return a.name.localeCompare(b.name);
        return bA > bB ? -1 : 1;
      }
      default:
        return 0;
    }
  });
}

