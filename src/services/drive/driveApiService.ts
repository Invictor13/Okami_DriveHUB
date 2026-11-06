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
 *
 * LIMITAÇÃO DOCUMENTADA — DRIVES COMPARTILHADOS (SHARED DRIVES):
 * - O identificador canônico 'root' refere-se estritamente à raiz do "Meu Drive" (My Drive) do usuário.
 * - Drives Compartilhados (Shared Drives) possuem IDs próprios e não são filhos diretos de 'root'.
 * - Os parâmetros supportsAllDrives=true e includeItemsFromAllDrives=true são incluídos para que itens
 *   pertencentes a drives compartilhados possam ser acessados caso o usuário busque por nome ou acesse
 *   uma subpasta de unidade compartilhada diretamente pelo seu ID canônico.
 * - A descoberta/listagem de unidades compartilhadas de primeiro nível não é realizada pelo endpoint
 *   files.list na raiz 'root', necessitando do endpoint específico drives.list (não implementado nesta fase).
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
 * Opções de consulta para listagem e busca de arquivos
 */
export interface FetchDriveFilesOptions {
  /**
   * ID da pasta pai (ex: 'root' para o diretório raiz ou ID canônico opaco de uma pasta).
   * Padrão: 'root'
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
   * Termo de busca textual por nome (gera 'name contains ...').
   * Sanitizado e escapado automaticamente contra injeção de parâmetros.
   */
  searchTerm?: string;
  /**
   * Se true e searchTerm fornecido, restringe a busca aos itens filhos de parentId.
   * Se false e searchTerm fornecido, busca em todo o Drive visível do usuário.
   * Padrão: true
   */
  restrictToFolder?: boolean;
  /**
   * Filtro opcional por MIME type específico na API (ex: 'application/vnd.google-apps.folder')
   */
  mimeTypeFilter?: string;
  /**
   * Consulta personalizada legada mantida para compatibilidade em testes existentes.
   */
  customQuery?: string;
  /**
   * AbortSignal opcional para cancelamento ativo da requisição HTTP em voo
   */
  signal?: AbortSignal;
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
 * Escapa com segurança caracteres especiais em valores literais da Google Drive API Search Query (q).
 * Strings na sintaxe de consulta da Drive API são delimitadas por aspas simples (').
 * Aspas simples e barras invertidas devem ser escapadas com barra invertida (\).
 * Quebras de linha e caracteres de controle são normalizados para espaços.
 */
export function escapeDriveQueryTerm(term: string): string {
  return term
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

/**
 * Constrói a expressão de consulta (q) da Google Drive API de forma segura e estrita.
 */
export function buildDriveQuery(options: FetchDriveFilesOptions = {}): string {
  const {
    parentId = 'root',
    searchTerm,
    restrictToFolder = true,
    mimeTypeFilter,
    customQuery,
  } = options;

  if (customQuery) {
    return customQuery;
  }

  const clauses: string[] = [];
  const cleanParentId = parentId.trim() || 'root';
  const cleanSearchTerm = searchTerm?.trim();

  if (cleanSearchTerm) {
    if (restrictToFolder) {
      const escapedParent = escapeDriveQueryTerm(cleanParentId);
      clauses.push(`'${escapedParent}' in parents`);
    }
    const escapedTerm = escapeDriveQueryTerm(cleanSearchTerm);
    clauses.push(`name contains '${escapedTerm}'`);
  } else {
    const escapedParent = escapeDriveQueryTerm(cleanParentId);
    clauses.push(`'${escapedParent}' in parents`);
  }

  clauses.push('trashed = false');

  if (mimeTypeFilter) {
    const escapedMime = escapeDriveQueryTerm(mimeTypeFilter.trim());
    clauses.push(`mimeType = '${escapedMime}'`);
  }

  return clauses.join(' and ');
}

/**
 * Constrói a URL completa para a requisição files.list
 */
export function buildFilesListUrl(
  options: FetchDriveFilesOptions = {}
): string {
  const { pageToken, pageSize = 50, orderBy = 'folder, name' } = options;

  const url = new URL(GOOGLE_DRIVE_FILES_API);

  const q = buildDriveQuery(options);

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
      signal: options.signal,
    });
  } catch (err) {
    if (
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && err.name === 'AbortError')
    ) {
      throw err;
    }
    throw createDriveError(
      'network_error',
      'Falha de comunicação de rede ao contatar a Google Drive API.',
      undefined,
      err instanceof Error ? err.message : undefined
    );
  }

  // Tratamento específico por código de status HTTP
  if (response.status === 401) {
    // Descarta o token expirado/revogado da memória volátil
    tokenStore.clearToken();
    throw createDriveError(
      'unauthenticated',
      'Sessão do Google expirada ou token revogado. Por favor, autentique-se novamente.',
      401
    );
  }

  if (response.status === 403) {
    throw createDriveError(
      'forbidden',
      'Acesso negado ou permissão insuficiente para acessar o Google Drive.',
      403
    );
  }

  if (response.status === 404) {
    throw createDriveError(
      'not_found',
      'Pasta ou recurso não encontrado no Google Drive.',
      404
    );
  }

  if (response.status === 429) {
    throw createDriveError(
      'rate_limit',
      'Limite de requisições por segundo da Google Drive API atingido. Aguarde alguns instantes.',
      429
    );
  }

  if (response.status >= 500) {
    throw createDriveError(
      'server_error',
      `Serviços do Google temporariamente indisponíveis (HTTP ${response.status}). Tente novamente mais tarde.`,
      response.status
    );
  }

  if (!response.ok) {
    throw createDriveError(
      'unknown',
      `Resposta inesperada da Google Drive API (HTTP ${response.status}).`,
      response.status
    );
  }

  // Parse e validação estrita do payload JSON com Zod
  let rawData: unknown;
  try {
    rawData = await response.json();
  } catch (err) {
    throw createDriveError(
      'validation_error',
      'Resposta da Google Drive API não pôde ser interpretada como JSON.',
      response.status,
      err instanceof Error ? err.message : undefined
    );
  }

  const validation = validateDriveListResponse(rawData);
  if (!validation.success) {
    throw createDriveError(
      'validation_error',
      'Dados retornados pela Google Drive API violam os contratos de domínio.',
      response.status,
      validation.error
    );
  }

  return validation.data;
}
