import { describe, it, expect } from 'vitest';
import type { DriveFile, BookmarkItem, SyncStatus, AuthStatus } from '@/types';
import { validateDriveItem } from '@/utils/validators';
import { validateCanonicalId } from '@/utils/sanitizers';

describe('Integridade de Dados e Separação de Domínio (PR03)', () => {
  it('garante que arquivos legítimos do Google Drive possuem IDs opacos preservados', () => {
    const rawApiPayload = {
      id: '1DNvQzid1twp_vnxS3dgDrHdhnw5u152k',
      name: 'Documento Pessoal Real.pdf',
      mimeType: 'application/pdf',
      size: 1048576,
    };

    const validated = validateDriveItem(rawApiPayload);
    expect(validated.success).toBe(true);
    if (validated.success) {
      expect(validateCanonicalId(validated.data.id)).toBe(
        '1DNvQzid1twp_vnxS3dgDrHdhnw5u152k'
      );
      // Garante que não é um ID gerado artificialmente com padrão de mock
      expect(validated.data.id).not.toMatch(/^item-\d+/);
      expect(validated.data.id).not.toMatch(/^upload-\d+/);
      expect(validated.data.id).not.toMatch(/^audio-taverna/);
    }
  });

  it('diferencia explicitamente bookmarks locais de arquivos do Google Drive', () => {
    const localBookmark: BookmarkItem = {
      id: 'bm-local-1',
      title: 'GitHub Repositórios',
      url: 'https://github.com',
      category: 'Desenvolvimento',
      createdAt: '2026-11-05T00:00:00.000Z',
    };

    // Um bookmark local não deve ser aceito como um item de arquivo do Google Drive
    const driveValidation = validateDriveItem(localBookmark);
    expect(driveValidation.success).toBe(false);
    if (!driveValidation.success) {
      expect(driveValidation.error).toContain('mimeType');
    }
  });

  it('valida os estados legítimos de sincronização', () => {
    const validStatuses: SyncStatus[] = [
      'disconnected',
      'idle',
      'loading',
      'syncing',
      'synchronized',
      'error',
    ];

    expect(validStatuses).toContain('disconnected');
    expect(validStatuses).toContain('syncing');
    expect(validStatuses).toContain('synchronized');
    expect(validStatuses).toHaveLength(6);
  });

  it('valida os estados legítimos de autenticação', () => {
    const validAuthStatuses: AuthStatus[] = [
      'disconnected',
      'connecting',
      'connected',
      'error',
    ];

    expect(validAuthStatuses).toContain('disconnected');
    expect(validAuthStatuses).toContain('connected');
    expect(validAuthStatuses).toHaveLength(4);
  });

  it('garante que DriveFile respeita a tipagem estrita de campos opcionais', () => {
    const minimalFile: DriveFile = {
      id: 'opaque_id_123',
      name: 'exemplo.txt',
      mimeType: 'text/plain',
    };

    expect(minimalFile.parents).toBeUndefined();
    expect(minimalFile.size).toBeUndefined();
    expect(minimalFile.thumbnailLink).toBeUndefined();
  });
});

