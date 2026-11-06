/**
 * Testes Unitários do ErrorBoundary — Okami DriveHUB
 *
 * Valida a captura de exceções em tempo de renderização, exibição da interface
 * de diagnóstico e sanitização estrita de tokens/credenciais sensíveis.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ErrorBoundary,
  sanitizeErrorMessage,
} from '@/components/common/ErrorBoundary';

const BombComponent = ({
  shouldThrow,
  message,
}: {
  shouldThrow: boolean;
  message: string;
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Aplicação Normal</div>;
};

describe('ErrorBoundary & sanitizeErrorMessage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renderiza os filhos normalmente quando nenhuma exceção é lançada', () => {
    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={false} message="Nada" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Aplicação Normal')).toBeInTheDocument();
  });

  it('captura o erro de renderização e exibe o painel de diagnóstico sem tela branca', () => {
    render(
      <ErrorBoundary>
        <BombComponent
          shouldThrow={true}
          message="Falha de conexão com componente"
        />
      </ErrorBoundary>
    );

    expect(screen.getByText('Erro de Inicialização')).toBeInTheDocument();
    expect(
      screen.getByText('Falha de conexão com componente')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Recarregar Aplicação/i })
    ).toBeInTheDocument();
  });

  it('sanitiza e mascara rigorosamente tokens Bearer, ya29 e parâmetros sensíveis', () => {
    const rawError =
      'Falha no token ya29.a0AfH6SMD_secret123456 e cabeçalho Bearer secretTokenABC e access_token=secretTokenXYZ987';

    const sanitized = sanitizeErrorMessage(rawError);

    expect(sanitized).not.toContain('ya29.a0AfH6SMD_secret123456');
    expect(sanitized).not.toContain('secretTokenABC');
    expect(sanitized).not.toContain('secretTokenXYZ987');
    expect(sanitized).toContain('Bearer [REDACTED]');
    expect(sanitized).toContain('ya29.[REDACTED]');
    expect(sanitized).toContain('token=[REDACTED]');
  });

  it('aciona window.location.reload ao clicar no botão de recarregar', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadMock },
    });

    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} message="Erro qualquer" />
      </ErrorBoundary>
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Recarregar Aplicação/i })
    );
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});
