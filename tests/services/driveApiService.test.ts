import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchDriveFiles,
  buildFilesListUrl,
  GOOGLE_DRIVE_FILES_API,
  DEFAULT_DRIVE_FIELDS,
} from '@/services/drive/driveApiService';
import * as tokenStore from '@/services/auth/tokenStore';
import { mockValidDriveFile, mockValidDriveFolder } from '../mocks/driveMocks';

describe('driveApiService — Cliente HTTP da Google Drive API v3 (PR05)', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Construção Segura da URL de Consulta (buildFilesListUrl)', () => {
    it('constrói a URL para a pasta raiz com parâmetros padrão', () => {
      const urlStr = buildFilesListUrl({ parentId: 'root' });
      const parsed = new URL(urlStr);

      expect(parsed.origin + parsed.pathname).toBe(GOOGLE_DRIVE_FILES_API);
      expect(parsed.searchParams.get('q')).toBe(
        "'root' in parents and trashed = false"
      );
      expect(parsed.searchParams.get('fields')).toBe(DEFAULT_DRIVE_FIELDS);
      expect(parsed.searchParams.get('supportsAllDrives')).toBe('true');
      expect(parsed.searchParams.get('includeItemsFromAllDrives')).toBe('true');
      expect(parsed.searchParams.get('pageSize')).toBe('50');
      expect(parsed.searchParams.has('pageToken')).toBe(false);

      // REGRA DE SEGURANÇA: O access token NUNCA deve estar presente na URL
      expect(urlStr).not.toContain('Bearer');
      expect(urlStr).not.toContain('access_token');
    });

    it('constrói a consulta para uma subpasta específica usando seu ID canônico opaco', () => {
      const folderId = '0B_canonical_folder_id_xyz789';
      const urlStr = buildFilesListUrl({ parentId: folderId });
      const parsed = new URL(urlStr);

      expect(parsed.searchParams.get('q')).toBe(
        `'${folderId}' in parents and trashed = false`
      );
    });

    it('inclui pageToken quando solicitado para paginação', () => {
      const urlStr = buildFilesListUrl({ pageToken: 'token_page_next_123' });
      const parsed = new URL(urlStr);

      expect(parsed.searchParams.get('pageToken')).toBe('token_page_next_123');
    });
  });

  describe('Requisições HTTP Autenticadas (fetchDriveFiles)', () => {
    it('rejeita com código unauthenticated (HTTP 401) se não houver token em memória', async () => {
      tokenStore.clearToken();

      await expect(fetchDriveFiles()).rejects.toEqual(
        expect.objectContaining({
          code: 'unauthenticated',
          status: 401,
          message: expect.stringContaining('Nenhum token de acesso válido'),
        })
      );
    });

    it('envia cabeçalho Authorization: Bearer e retorna resposta validada com sucesso', async () => {
      const fakeToken = 'valid-in-memory-token-test';
      tokenStore.setToken(fakeToken, 3600);

      const mockResponseData = {
        files: [mockValidDriveFile, mockValidDriveFolder],
        nextPageToken: 'next_page_token_abc',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponseData,
      } as unknown as Response);

      const result = await fetchDriveFiles({ parentId: 'root' });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const callArgs = fetchSpy.mock.calls[0];
      const headers = callArgs?.[1]?.headers as Record<string, string>;

      expect(headers['Authorization']).toBe(`Bearer ${fakeToken}`);
      expect(headers['Accept']).toBe('application/json');

      expect(result.files).toHaveLength(2);
      expect(result.files[0]?.id).toBe(mockValidDriveFile.id);
      expect(result.nextPageToken).toBe('next_page_token_abc');
    });

    it('trata HTTP 401: limpa tokenStore e lança erro unauthenticated', async () => {
      tokenStore.setToken('expired-token-to-be-cleared', 3600);
      expect(tokenStore.getToken()).not.toBeNull();

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { code: 401, message: 'Invalid Credentials' },
        }),
      } as unknown as Response);

      await expect(fetchDriveFiles()).rejects.toEqual(
        expect.objectContaining({
          code: 'unauthenticated',
          status: 401,
        })
      );

      // REGRA INEGOCIÁVEL: O token DEVE ser descartado imediatamente da memória
      expect(tokenStore.getToken()).toBeNull();
    });

    it('trata HTTP 403 (acesso negado ou permissão insuficiente)', async () => {
      tokenStore.setToken('valid-token', 3600);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: { code: 403, message: 'Forbidden' } }),
      } as unknown as Response);

      await expect(fetchDriveFiles()).rejects.toEqual(
        expect.objectContaining({
          code: 'forbidden',
          status: 403,
          message: expect.stringContaining('Acesso negado'),
        })
      );
    });

    it('trata HTTP 404 (pasta ou arquivo não encontrado)', async () => {
      tokenStore.setToken('valid-token', 3600);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: { code: 404, message: 'File not found' } }),
      } as unknown as Response);

      await expect(
        fetchDriveFiles({ parentId: 'non_existent_folder_id' })
      ).rejects.toEqual(
        expect.objectContaining({
          code: 'not_found',
          status: 404,
        })
      );
    });

    it('trata HTTP 429 (taxa limite de requisições excedida)', async () => {
      tokenStore.setToken('valid-token', 3600);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { code: 429, message: 'Rate Limit' } }),
      } as unknown as Response);

      await expect(fetchDriveFiles()).rejects.toEqual(
        expect.objectContaining({
          code: 'rate_limit',
          status: 429,
          message: expect.stringContaining('Limite de requisições'),
        })
      );
    });

    it('trata HTTP 500 (falha interna nos servidores da Google)', async () => {
      tokenStore.setToken('valid-token', 3600);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { code: 500, message: 'Backend Error' } }),
      } as unknown as Response);

      await expect(fetchDriveFiles()).rejects.toEqual(
        expect.objectContaining({
          code: 'server_error',
          status: 500,
          message: expect.stringContaining('temporariamente indisponíveis'),
        })
      );
    });

    it('trata falhas de rede (ex: perda de conexão com a internet)', async () => {
      tokenStore.setToken('valid-token', 3600);

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(fetchDriveFiles()).rejects.toEqual(
        expect.objectContaining({
          code: 'network_error',
          message: expect.stringContaining('Falha de comunicação de rede'),
        })
      );
    });

    it('rejeita com validation_error se a resposta JSON não contiver a estrutura esperada', async () => {
      tokenStore.setToken('valid-token', 3600);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          files: 'estrutura-invalida-nao-array',
        }),
      } as unknown as Response);

      await expect(fetchDriveFiles()).rejects.toEqual(
        expect.objectContaining({
          code: 'validation_error',
          message: expect.stringContaining('violam os contratos de domínio'),
        })
      );
    });
  });
});
