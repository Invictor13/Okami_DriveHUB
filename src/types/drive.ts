/**
 * Contratos de Domínio — Google Drive API v3
 *
 * Modelagem estrita e transparente dos metadados oficiais retornados
 * pelos endpoints da Google Drive API v3 (ex: files.list, files.get).
 */

/**
 * Classificação semântica do item na interface
 */
export type DriveItemKind =
  | 'folder'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'text'
  | 'shortcut'
  | 'file';

/**
 * MimeTypes canônicos conhecidos do ecossistema Google Workspace e padrões web
 */
export const GOOGLE_DRIVE_MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
  SHORTCUT: 'application/vnd.google-apps.shortcut',
  DOCUMENT: 'application/vnd.google-apps.document',
  SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
  PRESENTATION: 'application/vnd.google-apps.presentation',
  FORM: 'application/vnd.google-apps.form',
  DRAWING: 'application/vnd.google-apps.drawing',
  PDF: 'application/pdf',
} as const;

/**
 * Detalhes de destino de um atalho do Google Drive
 */
export interface DriveShortcutDetails {
  targetId: string;
  targetMimeType: string;
  targetResourceKey?: string;
}

/**
 * Capacidades e permissões do usuário corrente sobre o item
 */
export interface DriveCapabilities {
  canEdit?: boolean;
  canComment?: boolean;
  canShare?: boolean;
  canCopy?: boolean;
  canReadRevisions?: boolean;
  canDelete?: boolean;
  canTrash?: boolean;
}

/**
 * Contrato base de um item retornado pela API Google Drive v3.
 * NOTA: O ID do Google Drive é um identificador opaco canônico;
 * não deve ser assumido como numérico nem seguir formatos arbitrários.
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
  size?: number;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  trashed?: boolean;
  shared?: boolean;
  driveId?: string;
  version?: string;
  capabilities?: DriveCapabilities;
  shortcutDetails?: DriveShortcutDetails;
}

/**
 * Representação de uma pasta real no Google Drive
 */
export interface DriveFolder extends DriveFile {
  mimeType: typeof GOOGLE_DRIVE_MIME_TYPES.FOLDER;
}

/**
 * Representação de um atalho real no Google Drive
 */
export interface DriveShortcut extends DriveFile {
  mimeType: typeof GOOGLE_DRIVE_MIME_TYPES.SHORTCUT;
  shortcutDetails: DriveShortcutDetails;
}

/**
 * União de itens aceitos pela aplicação
 */
export type DriveItem = DriveFolder | DriveShortcut | DriveFile;

/**
 * Resposta paginada oficial do endpoint files.list
 */
export interface DriveListResponse {
  nextPageToken?: string;
  files: DriveItem[];
  incompleteSearch?: boolean;
}

/**
 * Detalhe de erro retornado pela API do Google
 */
export interface DriveApiErrorItem {
  domain?: string;
  reason?: string;
  message: string;
  location?: string;
  locationType?: string;
}

/**
 * Erro oficial retornado pela API Google Drive v3
 */
export interface DriveApiError {
  code: number;
  message: string;
  status?: string;
  errors?: DriveApiErrorItem[];
}

