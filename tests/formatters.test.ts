import { describe, it, expect } from 'vitest';
import { formatBytes } from '@/utils/formatters';

describe('formatBytes — Conversão Segura de Tamanho de Arquivo', () => {
  it('retorna "0 B" para tamanho zero', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes('0')).toBe('0 B');
  });

  it('converte bytes expressos em string ou número corretamente', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes('1024')).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes('1048576')).toBe('1 MB');
    expect(formatBytes('1073741824')).toBe('1 GB');
    expect(formatBytes(1099511627776)).toBe('1 TB');
  });

  it('retorna traço "—" para valores nulos, indefinidos ou vazios (ex: pastas ou Docs)', () => {
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes('')).toBe('—');
  });

  it('retorna traço "—" para valores inválidos, negativos ou floats inseguros', () => {
    expect(formatBytes(-100)).toBe('—');
    expect(formatBytes('-50')).toBe('—');
    expect(formatBytes('invalido')).toBe('—');
    expect(formatBytes(NaN)).toBe('—');
    expect(formatBytes(1024.5)).toBe('—');
  });

  it('processa com precisão BigInt valores próximos e acima de Number.MAX_SAFE_INTEGER e até o limite int64', () => {
    // Number.MAX_SAFE_INTEGER = 9007199254740991 (~8 PB)
    expect(formatBytes(Number.MAX_SAFE_INTEGER)).toBe('8 PB');
    expect(formatBytes('9007199254740993')).toBe('8 PB');

    // Limite máximo int64: 9223372036854775807 (~8 EB)
    expect(formatBytes('9223372036854775807')).toBe('8 EB');

    // Acima do limite int64 deve retornar '—'
    expect(formatBytes('9223372036854775808')).toBe('—');
  });
});
