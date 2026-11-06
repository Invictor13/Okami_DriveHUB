/**
 * Utilitários de Formatação — Okami DriveHUB
 */

/**
 * Converte bytes (number ou string numérica de 64 bits) em representação humana legível (B, KB, MB, GB, TB, PB).
 * Retorna '—' se o valor for nulo, indefinido, vazio ou inválido.
 */
export function formatBytes(
  bytes?: number | string | null,
  decimals = 1
): string {
  if (bytes === undefined || bytes === null || bytes === '') {
    return '—';
  }

  const num = typeof bytes === 'string' ? Number(bytes) : bytes;

  if (isNaN(num) || num < 0) {
    return '—';
  }

  if (num === 0) return '0 B';

  const k = 1024;
  const dm = Math.max(0, decimals);
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(num) / Math.log(k)), sizes.length - 1);

  return `${parseFloat((num / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
