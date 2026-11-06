import { describe, it, expect } from 'vitest';
import {
  validateDriveItem,
  validateDriveListResponse,
  validateDriveApiError,
  isDriveFolder,
  isDriveShortcut,
  resolveItemKind,
  DriveSizeSchema,
} from '@/utils/validators';
import {
  mockValidDriveFile,
  mockValidDriveFolder,
  mockMinimalDriveFile,
  mockValidDriveShortcut,
  mockValidDriveListResponse,
  mockDriveApiErrorPayload,
  mockInvalidDriveItemMissingRequired,
  mockInvalidDriveItemEmptyId,
} from './mocks/driveMocks';

describe('Camada de Validação — Contratos Google Drive API v3 (PR03)', () => {
  it('valida com sucesso um objeto completo de arquivo real do Google Drive', () => {
    const result = validateDriveItem(mockValidDriveFile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(mockValidDriveFile.id);
      expect(result.data.name).toBe(mockValidDriveFile.name);
      expect(result.data.mimeType).toBe(mockValidDriveFile.mimeType);
      expect(result.data.size).toBe(mockValidDriveFile.size);
    }
  });

  it('valida com sucesso um objeto de pasta real do Google Drive', () => {
    const result = validateDriveItem(mockValidDriveFolder);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(isDriveFolder(result.data)).toBe(true);
      expect(isDriveShortcut(result.data)).toBe(false);
    }
  });

  it('valida com sucesso um arquivo contendo apenas campos obrigatórios mínimos', () => {
    const result = validateDriveItem(mockMinimalDriveFile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('min_id_789');
      expect(result.data.parents).toBeUndefined();
      expect(result.data.size).toBeUndefined();
    }
  });

  it('valida com sucesso um atalho do Google Drive com shortcutDetails', () => {
    const result = validateDriveItem(mockValidDriveShortcut);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(isDriveShortcut(result.data)).toBe(true);
      expect(isDriveFolder(result.data)).toBe(false);
      expect(result.data.shortcutDetails?.targetId).toBe(
        'target_spreadsheet_id_999'
      );
    }
  });

  it('rejeita objetos que não possuem campos obrigatórios essenciais (ex: sem id e name)', () => {
    const result = validateDriveItem(mockInvalidDriveItemMissingRequired);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('id');
      expect(result.error).toContain('name');
    }
  });

  it('rejeita itens cujo ID seja uma string vazia', () => {
    const result = validateDriveItem(mockInvalidDriveItemEmptyId);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('ID do Google Drive não pode ser vazio');
    }
  });

  it('valida a estrutura completa de resposta do endpoint files.list', () => {
    const result = validateDriveListResponse(mockValidDriveListResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.files).toHaveLength(3);
      expect(result.data.nextPageToken).toBe('token_page_2_xyz');
    }
  });

  it('rejeita respostas incompletas ou corrompidas de files.list', () => {
    const invalidList = { nextPageToken: 123, files: 'não é um array' };
    const result = validateDriveListResponse(invalidList);
    expect(result.success).toBe(false);
  });

  it('valida e extrai adequadamente um erro oficial da API do Google Drive', () => {
    const result = validateDriveApiError(mockDriveApiErrorPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe(403);
      expect(result.data.message).toBe('User Rate Limit Exceeded');
    }
  });

  it('resolve a categoria semântica do item corretamente a partir do mimeType e extensão', () => {
    expect(resolveItemKind('application/vnd.google-apps.folder')).toBe(
      'folder'
    );
    expect(resolveItemKind('application/vnd.google-apps.shortcut')).toBe(
      'shortcut'
    );
    expect(resolveItemKind('application/pdf')).toBe('pdf');
    expect(resolveItemKind('image/png')).toBe('image');
    expect(resolveItemKind('video/mp4')).toBe('video');
    expect(resolveItemKind('audio/mpeg')).toBe('audio');
    expect(resolveItemKind('text/markdown')).toBe('text');
    expect(resolveItemKind('application/octet-stream', 'documento.txt')).toBe(
      'text'
    );
    expect(
      resolveItemKind('application/octet-stream', 'desconhecido.bin')
    ).toBe('file');
  });

  describe('Validação Estrita de Tamanho (size) — Compatibilidade Google Drive API v3 (PR05)', () => {
    it('aceita e preserva strings numéricas int64 legítimas', () => {
      const parsed = DriveSizeSchema.safeParse('1048576');
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toBe('1048576');
      }
    });

    it('preserva valores inteiros de 64 bits gigantes sem perda silenciosa de precisão', () => {
      // Exemplo de tamanho acima de Number.MAX_SAFE_INTEGER (9007199254740991)
      const bigIntStr = '9007199254740992999';
      const parsed = DriveSizeSchema.safeParse(bigIntStr);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toBe(bigIntStr);
      }
    });

    it('converte números inteiros não-negativos para string fielmente', () => {
      const parsed = DriveSizeSchema.safeParse(4096);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toBe('4096');
      }
    });

    it('aceita valor zero para arquivos vazios', () => {
      expect(DriveSizeSchema.parse('0')).toBe('0');
      expect(DriveSizeSchema.parse(0)).toBe('0');
    });

    it('rejeita valores negativos em números e strings', () => {
      expect(DriveSizeSchema.safeParse(-1).success).toBe(false);
      expect(DriveSizeSchema.safeParse('-1024').success).toBe(false);
    });

    it('rejeita strings com caracteres não-numéricos ou decimais', () => {
      expect(DriveSizeSchema.safeParse('abc').success).toBe(false);
      expect(DriveSizeSchema.safeParse('12.34').success).toBe(false);
      expect(DriveSizeSchema.safeParse('').success).toBe(false);
    });

    it('permite tamanho omitido (undefined) para pastas e documentos Google Workspace', () => {
      const parsed = DriveSizeSchema.safeParse(undefined);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data).toBeUndefined();
      }
    });
  });
});
