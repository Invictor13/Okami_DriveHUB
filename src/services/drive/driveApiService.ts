/**
 * Cliente HTTP da Google Drive API v3 — Okami DriveHUB
 *
 * Responsável pela comunicação direta e segura com os endpoints oficiais
 * da API v3 do Google Drive (ex: files.list).
 *
 * REGRAS INEGOCIÁVEIS:
 * - Operações estritamente de LEITURA (read-only).
 * - Access token injetado exclusivamente via cabeçalho Authorization: Bearer.
 * - Zero tokens em URLs, parâmetros de busca, logs ou mensagens de erro.
 * - Validação em tempo de execução via Zod (validateDriveListResponse).
 * - Em HTTP 401, descartar imediatamente o token da memória volátil.
 */

import { DriveListResponse } from '@/types/drive';
import { validateDriveListResponse } from '@/utils/validators';
import * as tokenStore from '@/services/auth/tokenStore';

/**
 * Endpoint oficial da Google Drive API v3 para recursos de arquivos e pastas
 */
export const GOOGLE_DRIVE_FILES_API =
  'https://www.googleapis.com/drive/v3/files';

/**
 * Metadados estritamente necessários solicitados via parâmetro fields
 */
export const DEFAULT_DRIVE_FIELDS = [
  'nextPageToken',
  'incompleteSearch',
  'files(id, name, mimeType, parents, createdTime, modifiedTime, size, webViewLink, webContentLink, iconLink, thumbnailLink, trashed, shared, driveId, version, capabilities, shortcutDetails)',
].join(', ');

/**
 * Opções de consulta para listagem de arquivos
 */
export interface FetchDriveFilesOptions {
  /**
   * ID da pasta pai (ex: 'root' para o diretório raiz ou ID canônico opaco de uma pasta)
   */
  parentId?: string;
  /**
   * Token para recuperação da próxima página de resultados
   */
  pageToken?: string;
  /**
   * Quantidade de itens por página (padrão: 50, máx: 100)
   */
  pageSize?: number;
  /**
   * Ordenação dos resultados (padrão: pastas primeiro, depois ordem alfabética de nome)
   */
  orderBy?: string;
  /**
   * Consulta personalizada no formato Google Drive Search Query.
   * Se informada, substitui o filtro padrão de parentId.
   */
  customQuery?: string;
}

/**
 * Códigos padronizados de erro do serviço Drive
 */
export type DriveErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit'
  | 'server_error'
  | 'network_error'
  | 'validation_error'
  | 'unknown';

/**
 * Estrutura padronizada de erro da Google Drive API
 */
export interface DriveServiceError {
  code: DriveErrorCode;
  status?: number;
  message: string;
  details?: unknown;
}

/**
 * Cria um objeto de erro padronizado para a camada de serviços
 */
export function createDriveError(
  code: DriveErrorCode,
  message: string,
  status?: number,
  details?: unknown
): DriveServiceError {
  return { code, message, status, details };
}

/**
 * Constrói a URL completa para a requisição files.list
 */
export function buildFilesListUrl(
  options: FetchDriveFilesOptions = {}
): string {
  const {
    parentId = 'root',
    pageToken,
    pageSize = 50,
    orderBy = 'folder, name',
    customQuery,
  } = options;

  const url = new URL(GOOGLE_DRIVE_FILES_API);

  // Consulta padrão: itens não excluídos pertencentes à pasta pai especificada
  const q = customQuery ?? `'${parentId}' in parents and trashed = false`;

  url.searchParams.set('q', q);
  url.searchParams.set('fields', DEFAULT_DRIVE_FIELDS);
  url.searchParams.set(
    'pageSize',
    String(Math.min(Math.max(pageSize, 1), 100))
  );
  url.searchParams.set('orderBy', orderBy);

  // Parâmetros oficiais para suporte amplo a arquivos compartilhados e drives corporativos
  url.searchParams.set('supportsAllDrives', 'true');
  url.searchParams.set('includeItemsFromAllDrives', 'true');

  if (pageToken) {
    url.searchParams.set('pageToken', pageToken);
  }

  return url.toString();
}

/**
 * Executa a requisição HTTP GET autenticada para listar arquivos e pastas do Google Drive.
 *
 * @param options Opções de paginação e filtragem
 * @returns Promessa com o payload paginado e tipado DriveListResponse
 */
export async function fetchDriveFiles(
  options: FetchDriveFilesOptions = {}
): Promise<DriveListResponse> {
  const token = tokenStore.getToken();

  if (!token) {
    throw createDriveError(
      'unauthenticated',
      'Nenhum token de acesso válido encontrado. Conecte sua conta Google.',
      401
    );
  }

  const requestUrl = buildFilesListUrl(options);

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
  } catch (err) {
    throw createDriveError(
      'network_error',
      'Falha de comunicação de rede ao contatar a Google Drive API.',
      undefined,
      err instanceof Error ? err.message : undefined
    );
  }

  // Tratamento específico de códigos de resposta HTTP
  if (!response.ok) {
    if (response.status === 401) {
      // REGRA INEGOCIÁVEL: Em 401, limpar token e exigir reconexão
      tokenStore.clearToken();
      throw createDriveError(
        'unauthenticated',
        'Sua sessão expirou ou o token de acesso foi revogado. Conecte-se novamente.',
        401
      );
    }

    if (response.status === 403) {
      throw createDriveError(
        'forbidden',
        'Acesso negado aos arquivos solicitados no Google Drive.',
        403
      );
    }

    if (response.status === 404) {
      throw createDriveError(
        'not_found',
        'A pasta ou diretório solicitado não foi encontrado no Google Drive.',
        404
      );
    }

    if (response.status === 429) {
      throw createDriveError(
        'rate_limit',
        'Limite de requisições excedido. Aguarde alguns instantes e tente novamente.',
        429
      );
    }

    if (response.status >= 500) {
      throw createDriveError(
        'server_error',
        'Os servidores da Google Drive API estão temporariamente indisponíveis. Tente mais tarde.',
        response.status
      );
    }

    throw createDriveError(
      'unknown',
      `Erro retornado pela Google Drive API (HTTP ${response.status}).`,
      response.status
    );
  }

  // Parse do corpo JSON
  let rawJson: unknown;
  try {
    rawJson = await response.json();
  } catch (err) {
    throw createDriveError(
      'validation_error',
      'A resposta da Google Drive API não contém um JSON válido.',
      response.status,
      err instanceof Error ? err.message : undefined
    );
  }

  // Validação em tempo de execução com Schemas Zod
  const validation = validateDriveListResponse(rawJson);
  if (!validation.success) {
    throw createDriveError(
      'validation_error',
      'Os dados retornados pela Google Drive API violam os contratos de domínio.',
      response.status,
      validation.error
    );
  }

  return validation.data;
}
