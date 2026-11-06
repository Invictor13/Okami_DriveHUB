/**
 * Contratos de Atalhos Web (Speed Dial) — Okami DriveHUB
 *
 * Dados locais mantidos no cliente e claramente diferenciados de arquivos do Drive.
 */

export interface BookmarkItem {
  id: string; // Ex: 'bm-local-...'
  title: string;
  url: string;
  category: string;
  color?: string;
  createdAt: string; // ISO 8601
}
