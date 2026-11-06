import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '@/App';
import * as authService from '@/services/auth/googleAuthService';
import * as tokenStore from '@/services/auth/tokenStore';

describe('Integração de Interface — Autenticação Google e Estados Reativos (PR04)', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    vi.restoreAllMocks();
  });

  it('renderiza o estado desconectado legítimo e botão para conectar conta Google', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /Google Drive Desconectado/i })
    ).toBeInTheDocument();

    const connectButton = screen.getByRole('button', {
      name: /Conectar Conta Google/i,
    });
    expect(connectButton).toBeInTheDocument();

    // Verificação de badges de arquitetura segura
    expect(screen.getByText(/Tokens em RAM/i)).toBeInTheDocument();
    expect(screen.getByText(/Menor Privilégio/i)).toBeInTheDocument();
  });

  it('exibe alerta compreensível quando o Client ID não está configurado', () => {
    vi.spyOn(authService, 'isGoogleClientConfigured').mockReturnValue(false);

    render(<App />);

    expect(
      screen.getByText(/Client ID do Google não configurado/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/VITE_GOOGLE_CLIENT_ID/i)).toBeInTheDocument();
  });

  it('apresenta mensagem amigável quando ocorre erro na autenticação (popup fechado)', async () => {
    vi.spyOn(authService, 'requestGoogleLogin').mockRejectedValue({
      code: 'popup_closed',
      message:
        'A janela de autorização do Google foi fechada antes da conclusão.',
    });

    render(<App />);

    const connectBtn = screen.getByRole('button', {
      name: /Conectar Conta Google/i,
    });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/fechada antes da conclusão/i)
      ).toBeInTheDocument();
    });
  });

  it('transita para o estado conectado quando a autenticação é bem-sucedida', async () => {
    vi.spyOn(authService, 'requestGoogleLogin').mockResolvedValue({
      status: 'connected',
      userName: 'Victor Viana',
      userEmail: 'victor.viana@example.com',
      expiresAt: Date.now() + 3600000,
    });

    render(<App />);

    const connectBtn = screen.getByRole('button', {
      name: /Conectar Conta Google/i,
    });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Conta Google Conectada/i })
      ).toBeInTheDocument();
      expect(
        screen.getAllByText('victor.viana@example.com').length
      ).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByRole('button', { name: /Desconectar Conta Google/i })
      ).toBeInTheDocument();
    });
  });

  it('SEPARAÇÃO INEGOCIÁVEL: Conexão da conta NÃO simula arquivos e NÃO declara sincronização concluída', async () => {
    vi.spyOn(authService, 'requestGoogleLogin').mockResolvedValue({
      status: 'connected',
      userName: 'Victor Viana',
      userEmail: 'victor.viana@example.com',
      expiresAt: Date.now() + 3600000,
    });

    render(<App />);

    const connectBtn = screen.getByRole('button', {
      name: /Conectar Conta Google/i,
    });
    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(
        screen.getAllByText('victor.viana@example.com').length
      ).toBeGreaterThanOrEqual(1);
    });

    // Confirma que a interface explica claramente que a listagem de arquivos pertence à PR05
    expect(screen.getAllByText(/PR05/i).length).toBeGreaterThanOrEqual(1);

    // Garante que nenhum arquivo fictício ou mock surge magicamente
    expect(screen.queryByText(/audio-taverna-ep1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/video-curta-01/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/minha-planilha-fake/i)).not.toBeInTheDocument();
  });
});
