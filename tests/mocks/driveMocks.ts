/**
 * DADOS DE TESTE — NUNCA UTILIZAR NA CAMADA DE PRODUÇÃO
 *
 * Mocks e fixtures isolados estritamente para testes unitários automatizados
 * e validação de contratos da Google Drive API v3.
 */

import { GOOGLE_DRIVE_MIME_TYPES } from '@/types/drive';

/**
 * Fixture de arquivo válido completo
 */
export const mockValidDriveFile = {
  id: '1a2b3c4d5e6f7g8h9i0j_valid_file_id',
  name: 'Relatório Técnico de Auditoria 2026.pdf',
  mimeType: GOOGLE_DRIVE_MIME_TYPES.PDF,
  parents: ['root_folder_id_xyz'],
  createdTime: '2026-10-15T14:32:00.000Z',
  modifiedTime: '2026-11-01T18:20:00.000Z',
  size: '2048576',
  webViewLink:
    'https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j_valid_file_id/view',
  webContentLink:
    'https://drive.google.com/uc?id=1a2b3c4d5e6f7g8h9i0j_valid_file_id&export=download',
  iconLink:
    'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf',
  thumbnailLink:
    'https://drive.google.com/thumbnail?id=1a2b3c4d5e6f7g8h9i0j_valid_file_id&sz=w400',
  trashed: false,
  shared: true,
  version: '2',
  capabilities: {
    canEdit: true,
    canShare: true,
    canDelete: false,
  },
};

/**
 * Fixture de pasta válida
 */
export const mockValidDriveFolder = {
  id: '0B_folder_canonical_id_456',
  name: 'Documentos Profissionais',
  mimeType: GOOGLE_DRIVE_MIME_TYPES.FOLDER,
  parents: ['root'],
  createdTime: '2026-01-10T10:00:00.000Z',
  modifiedTime: '2026-11-04T12:00:00.000Z',
  webViewLink:
    'https://drive.google.com/drive/folders/0B_folder_canonical_id_456',
  trashed: false,
  shared: false,
};

/**
 * Fixture de arquivo válido mínimo (apenas campos estritamente obrigatórios)
 */
export const mockMinimalDriveFile = {
  id: 'min_id_789',
  name: 'notas.txt',
  mimeType: 'text/plain',
};

/**
 * Fixture de atalho válido
 */
export const mockValidDriveShortcut = {
  id: 'shortcut_id_101',
  name: 'Atalho para Planilha Financeira',
  mimeType: GOOGLE_DRIVE_MIME_TYPES.SHORTCUT,
  shortcutDetails: {
    targetId: 'target_spreadsheet_id_999',
    targetMimeType: GOOGLE_DRIVE_MIME_TYPES.SPREADSHEET,
    targetResourceKey: 'res_key_abc',
  },
};

/**
 * Fixture de resposta paginada válida (files.list)
 */
export const mockValidDriveListResponse = {
  nextPageToken: 'token_page_2_xyz',
  files: [mockValidDriveFile, mockValidDriveFolder, mockValidDriveShortcut],
  incompleteSearch: false,
};

/**
 * Fixture de erro oficial da API do Google Drive
 */
export const mockDriveApiErrorPayload = {
  error: {
    code: 403,
    message: 'User Rate Limit Exceeded',
    status: 'PERMISSION_DENIED',
    errors: [
      {
        domain: 'usageLimits',
        reason: 'userRateLimitExceeded',
        message: 'User Rate Limit Exceeded',
      },
    ],
  },
};

/**
 * Fixture de objeto inválido (sem id e sem name)
 */
export const mockInvalidDriveItemMissingRequired = {
  mimeType: 'application/pdf',
  size: 1024,
};

/**
 * Fixture de objeto com ID vazio (violando o contrato opaco)
 */
export const mockInvalidDriveItemEmptyId = {
  id: '',
  name: 'Arquivo Com Id Vazio.pdf',
  mimeType: 'application/pdf',
};
