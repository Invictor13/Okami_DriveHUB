/**
 * Mecanismos de Proteção, Sanitização e Segurança — Okami DriveHUB
 *
 * Previne ataques de Cross-Site Scripting (XSS), injeção de HTML e
 * execução de protocolos perigosos em URLs externas ou metadados de arquivos.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapa caracteres especiais para prevenir injeção de HTML/Scripts
 */
export function sanitizeHtmlText(input: string): string {
  if (!input) return '';
  return String(input).replace(
    /[&<>"']/g,
    (char) => HTML_ENTITY_MAP[char] || char
  );
}

/**
 * Sanitiza e normaliza nomes de arquivos e pastas para exibição segura.
 *
 * - Remove caracteres de controle invisíveis e não imprimíveis.
 * - Remove tags HTML completas (<script>, <b>, etc.).
 * - Normaliza representação Unicode para forma NFC.
 * - Preserva caracteres legítimos em português e caracteres alfanuméricos.
 * - Não trunca nem gera nomes sintéticos arbitrários.
 */
export function sanitizeFileName(name: unknown): string {
  if (typeof name !== 'string') {
    return 'Arquivo sem nome';
  }

  // 1. Normalização Unicode para forma NFC
  let cleaned = name.normalize('NFC');

  // 2. Remove tags HTML completas (ex: <script>, <img src=x onerror=...>)
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // 3. Remove caracteres de controle não imprimíveis (ASCII 0-31 e 127-159)
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // 4. Substitui delimitadores HTML soltos residuais
  cleaned = cleaned.replace(/[<>]/g, '');

  // 5. Normaliza espaços múltiplos e apara extremidades
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 6. Retorna fallback seguro se o nome resultar vazio
  return cleaned.length > 0 ? cleaned : 'Arquivo sem nome';
}

/**
 * Protocolos de URL expressamente permitidos pela aplicação
 */
const ALLOWED_URL_PROTOCOLS = new Set(['https:', 'http:']);

/**
 * Sanitiza e valida URLs externas antes de permitir abertura ou navegação.
 *
 * - Rejeita categoricamente protocolos perigosos como 'javascript:', 'data:', 'vbscript:', 'file:'.
 * - Aceita apenas protocolos 'https:' e 'http:'.
 * - Retorna null para URLs malformadas ou inválidas.
 */
export function sanitizeUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) {
    return null;
  }

  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);

    // Valida protocolo seguro
    if (!ALLOWED_URL_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return null;
    }

    return parsed.href;
  } catch {
    // URL malformada
    return null;
  }
}

/**
 * Valida a integridade do ID canônico retornado pelo Google Drive.
 *
 * REGRA INEGOCIÁVEL:
 * O ID é opaco e nunca deve ser gerado artificialmente (ex: Date.now()).
 * Esta função apenas atesta a presença de uma string legítima e não-vazia.
 */
export function validateCanonicalId(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}
