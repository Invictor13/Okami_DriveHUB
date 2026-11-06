import { z } from 'zod';
import {
  type DriveItem,
  type DriveFolder,
  type DriveShortcut,
  type DriveListResponse,
  type DriveApiError,
  type DriveItemKind,
  GOOGLE_DRIVE_MIME_TYPES,
} from '@/types/drive';

/**
 * Schema Zod para as capacidades e permissões de um item no Google Drive
 */
export const DriveCapabilitiesSchema = z.object({
  canEdit: z.boolean().optional(),
  canComment: z.boolean().optional(),
  canShare: z.boolean().optional(),
  canCopy: z.boolean().optional(),
  canReadRevisions: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  canTrash: z.boolean().optional(),
});

/**
 * Schema Zod para detalhes de atalhos
 */
export const DriveShortcutDetailsSchema = z.object({
  targetId: z.string().min(1, 'targetId do atalho não pode ser vazio'),
  targetMimeType: z.string().min(1, 'targetMimeType não pode ser vazio'),
  targetResourceKey: z.string().optional(),
});

/**
 * Schema Zod estrito para metadados de arquivos e pastas reais do Google Drive API v3.
 *
 * REGRA INEGOCIÁVEL:
 * O ID retornado pelo Google Drive é um identificador opaco. Não impomos regras
 * arbitrárias de formato (ex: apenas numérico ou prefixado), validando apenas que
 * seja uma string não-vazia para preservar a integridade do ID canônico original.
 */
export const DriveItemSchema = z.object({
  id: z.string().min(1, 'ID do Google Drive não pode ser vazio'),
  name: z.string().min(1, 'Nome do item não pode ser vazio'),
  mimeType: z.string().min(1, 'mimeType não pode ser vazio'),
  parents: z.array(z.string().min(1)).optional(),
  createdTime: z.string().optional(),
  modifiedTime: z.string().optional(),
  size: z.coerce.number().nonnegative().optional(),
  webViewLink: z.string().url('webViewLink deve ser uma URL válida').optional(),
  webContentLink: z
    .string()
    .url('webContentLink deve ser uma URL válida')
    .optional(),
  iconLink: z.string().url('iconLink deve ser uma URL válida').optional(),
  thumbnailLink: z
    .string()
    .url('thumbnailLink deve ser uma URL válida')
    .optional(),
  trashed: z.boolean().optional(),
  shared: z.boolean().optional(),
  driveId: z.string().optional(),
  version: z.string().optional(),
  capabilities: DriveCapabilitiesSchema.optional(),
  shortcutDetails: DriveShortcutDetailsSchema.optional(),
});

/**
 * Schema para validar a resposta do endpoint files.list
 */
export const DriveListResponseSchema = z.object({
  nextPageToken: z.string().optional(),
  files: z.array(DriveItemSchema),
  incompleteSearch: z.boolean().optional(),
});

/**
 * Schema para detalhe de erro individual da API do Google
 */
export const DriveApiErrorDetailSchema = z.object({
  domain: z.string().optional(),
  reason: z.string().optional(),
  message: z.string(),
  location: z.string().optional(),
  locationType: z.string().optional(),
});

/**
 * Schema para objeto de erro da API Google Drive v3
 */
export const DriveApiErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  status: z.string().optional(),
  errors: z.array(DriveApiErrorDetailSchema).optional(),
});

/**
 * Valida um único item do Google Drive em tempo de execução
 */
export function validateDriveItem(
  raw: unknown
):
  | { success: true; data: DriveItem }
  | { success: false; error: string; issues: z.ZodIssue[] } {
  const result = DriveItemSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      error: `Objeto de item do Google Drive inválido: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      issues: result.error.issues,
    };
  }
  return { success: true, data: result.data as DriveItem };
}

/**
 * Valida o payload de resposta do files.list em tempo de execução
 */
export function validateDriveListResponse(
  raw: unknown
):
  | { success: true; data: DriveListResponse }
  | { success: false; error: string; issues: z.ZodIssue[] } {
  const result = DriveListResponseSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      error: `Resposta da Google Drive API inválida: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      issues: result.error.issues,
    };
  }
  return { success: true, data: result.data as DriveListResponse };
}

/**
 * Valida se um objeto corresponde a um erro oficial da Google Drive API
 */
export function validateDriveApiError(
  raw: unknown
): { success: true; data: DriveApiError } | { success: false; error: string } {
  // A API do Google pode aninhar o erro dentro de { error: { code, message, ... } }
  const target =
    typeof raw === 'object' && raw !== null && 'error' in raw
      ? (raw as { error: unknown }).error
      : raw;

  const result = DriveApiErrorSchema.safeParse(target);
  if (!result.success) {
    return {
      success: false,
      error: `Formato de erro da Google Drive API não reconhecido: ${result.error.message}`,
    };
  }
  return { success: true, data: result.data };
}

/**
 * Type guard para identificar se um item é uma pasta legítima
 */
export function isDriveFolder(item: DriveItem): item is DriveFolder {
  return item.mimeType === GOOGLE_DRIVE_MIME_TYPES.FOLDER;
}

/**
 * Type guard para identificar se um item é um atalho legítimo
 */
export function isDriveShortcut(item: DriveItem): item is DriveShortcut {
  return (
    item.mimeType === GOOGLE_DRIVE_MIME_TYPES.SHORTCUT &&
    item.shortcutDetails !== undefined &&
    typeof item.shortcutDetails.targetId === 'string'
  );
}

/**
 * Resolve a categoria semântica do item a partir do seu MIME type e extensão
 */
export function resolveItemKind(
  mimeType: string,
  fileName?: string
): DriveItemKind {
  const normalizedMime = mimeType.toLowerCase();
  const normalizedName = (fileName || '').toLowerCase();

  if (normalizedMime === GOOGLE_DRIVE_MIME_TYPES.FOLDER) return 'folder';
  if (normalizedMime === GOOGLE_DRIVE_MIME_TYPES.SHORTCUT) return 'shortcut';
  if (normalizedMime === GOOGLE_DRIVE_MIME_TYPES.DOCUMENT) return 'document';
  if (normalizedMime === GOOGLE_DRIVE_MIME_TYPES.SPREADSHEET)
    return 'spreadsheet';
  if (normalizedMime === GOOGLE_DRIVE_MIME_TYPES.PRESENTATION)
    return 'presentation';
  if (normalizedMime === GOOGLE_DRIVE_MIME_TYPES.PDF) return 'pdf';

  if (
    normalizedMime.startsWith('image/') ||
    /\.(jpe?g|png|gif|webp|svg|bmp|avif)$/.test(normalizedName)
  ) {
    return 'image';
  }
  if (
    normalizedMime.startsWith('video/') ||
    /\.(mp4|webm|mkv|mov|avi|m4v)$/.test(normalizedName)
  ) {
    return 'video';
  }
  if (
    normalizedMime.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|flac|aac)$/.test(normalizedName)
  ) {
    return 'audio';
  }
  if (
    normalizedMime.startsWith('text/') ||
    /\.(txt|md|json|csv|rtf)$/.test(normalizedName)
  ) {
    return 'text';
  }

  return 'file';
}
