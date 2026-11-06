/**
 * Utilitários de Formatação — Okami DriveHUB
 */

const MAX_INT64 = 9223372036854775807n;
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'] as const;

/**
 * Converte bytes (number ou string numérica de 64 bits) em representação humana legível (B, KB, MB, GB, TB, PB, EB).
 * Processa valores utilizando BigInt para prevenir perda de precisão acima de Number.MAX_SAFE_INTEGER
 * e respeita o limite máximo de 64 bits da Google Drive API v3.
 * Retorna '—' se o valor for nulo, indefinido, vazio, negativo ou inválido.
 */
export function formatBytes(
  bytes?: number | string | null,
  decimals = 1
): string {
  if (bytes === undefined || bytes === null || bytes === '') {
    return '—';
  }

  let b: bigint;

  if (typeof bytes === 'number') {
    if (
      isNaN(bytes) ||
      bytes < 0 ||
      !Number.isFinite(bytes) ||
      !Number.isSafeInteger(bytes)
    ) {
      return '—';
    }
    b = BigInt(bytes);
  } else if (typeof bytes === 'string') {
    const trimmed = bytes.trim();
    if (!/^\d+$/.test(trimmed)) {
      return '—';
    }
    try {
      b = BigInt(trimmed);
    } catch {
      return '—';
    }
  } else {
    return '—';
  }

  if (b < 0n || b > MAX_INT64) {
    return '—';
  }

  if (b === 0n) return '0 B';

  let unitIndex = 0;
  let temp = b;
  while (temp >= 1024n && unitIndex < UNITS.length - 1) {
    temp /= 1024n;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${b} B`;
  }

  const divisor = 1024n ** BigInt(unitIndex);
  const dm = Math.max(0, decimals);
  const multiplier = 10n ** BigInt(dm);

  let integerPart = b / divisor;
  const remainder = b % divisor;
  let fractionalPart = (remainder * multiplier) / divisor;

  // Arredondamento half-up exato sem ponto flutuante
  const roundingRemainder = (remainder * multiplier) % divisor;
  if (roundingRemainder * 2n >= divisor) {
    fractionalPart += 1n;
    if (fractionalPart >= multiplier) {
      integerPart += 1n;
      fractionalPart -= multiplier;
      if (integerPart >= 1024n && unitIndex < UNITS.length - 1) {
        unitIndex += 1;
        integerPart = 1n;
        fractionalPart = 0n;
      }
    }
  }

  if (dm === 0 || fractionalPart === 0n) {
    return `${integerPart} ${UNITS[unitIndex]}`;
  }

  const fractionStr = fractionalPart
    .toString()
    .padStart(dm, '0')
    .replace(/0+$/, '');
  const formattedNumber =
    fractionStr.length > 0 ? `${integerPart}.${fractionStr}` : `${integerPart}`;

  return `${formattedNumber} ${UNITS[unitIndex]}`;
}
