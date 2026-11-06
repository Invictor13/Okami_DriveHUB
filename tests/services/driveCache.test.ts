import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriveMemoryCache } from '@/services/drive/driveCache';
import { mockValidDriveFile, mockValidDriveFolder } from '../mocks/driveMocks';

describe('driveCache — Cache em Memória Volátil da Sessão (PR06)', () => {
  let cache: DriveMemoryCache;

  beforeEach(() => {
    cache = new DriveMemoryCache(5000); // 5 segundos de TTL para testes
    vi.restoreAllMocks();
  });

  it('armazena e recupera itens e nextPageToken de uma pasta visitada', () => {
    const folderId = 'folder_abc_123';
    const items = [mockValidDriveFile, mockValidDriveFolder];
    const pageToken = 'next_token_xyz';

    cache.set(folderId, items, pageToken);

    const cached = cache.get(folderId);
    expect(cached).toBeDefined();
    expect(cached?.folderId).toBe(folderId);
    expect(cached?.items).toHaveLength(2);
    expect(cached?.items[0]?.id).toBe(mockValidDriveFile.id);
    expect(cached?.nextPageToken).toBe(pageToken);
    expect(cache.size).toBe(1);
  });

  it('retorna undefined para pastas não cacheadas', () => {
    expect(cache.get('folder_inexistente')).toBeUndefined();
  });

  it('invalida e remove do cache uma pasta específica', () => {
    cache.set('folder_1', [mockValidDriveFile]);
    cache.set('folder_2', [mockValidDriveFolder]);
    expect(cache.size).toBe(2);

    cache.invalidate('folder_1');
    expect(cache.get('folder_1')).toBeUndefined();
    expect(cache.get('folder_2')).toBeDefined();
    expect(cache.size).toBe(1);
  });

  it('limpa integralmente todas as pastas do cache no método clear', () => {
    cache.set('folder_1', [mockValidDriveFile]);
    cache.set('folder_2', [mockValidDriveFolder]);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('folder_1')).toBeUndefined();
    expect(cache.get('folder_2')).toBeUndefined();
  });

  it('expira a entrada de cache após decorrido o tempo de TTL', () => {
    const folderId = 'folder_expiravel';
    const initialTime = 1000000;
    vi.spyOn(Date, 'now').mockReturnValue(initialTime);

    cache.set(folderId, [mockValidDriveFile]);
    expect(cache.get(folderId)).toBeDefined();

    // Avança o tempo além do TTL (5000ms)
    vi.spyOn(Date, 'now').mockReturnValue(initialTime + 5001);

    expect(cache.get(folderId)).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('não armazena nem expõe tokens de autenticação ou credenciais no cache', () => {
    cache.set('folder_safe', [mockValidDriveFile], 'token_publico_paginacao');
    const cached = cache.get('folder_safe') as unknown as Record<
      string,
      unknown
    >;

    expect(cached).not.toHaveProperty('token');
    expect(cached).not.toHaveProperty('access_token');
    expect(cached).not.toHaveProperty('authorization');
    expect(cached).not.toHaveProperty('credentials');
  });
});
