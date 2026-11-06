import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '@/App';

describe('Okami DriveHUB — Montagem da Fundação Técnica (PR02)', () => {
  it('renderiza o componente principal sem falhas', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Okami DriveHUB/i })
    ).toBeInTheDocument();
  });

  it('apresenta um estado legítimo de desconexão com o Google Drive', () => {
    render(<App />);
    // Verifica a comunicação honesta do estado de desconexão
    expect(
      screen.getByRole('heading', { name: /Google Drive Desconectado/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/integridade de dados/i)).toBeInTheDocument();
  });

  it('exibe a barra de sistema com os indicadores do usuário e do dock', () => {
    render(<App />);
    expect(screen.getByText(/Victor Viana/i)).toBeInTheDocument();
    expect(screen.getByText(/Home/i)).toBeInTheDocument();
    expect(screen.getByText(/Multimídia/i)).toBeInTheDocument();
    expect(screen.getByText(/Programação/i)).toBeInTheDocument();
    expect(screen.getByText(/ADM/i)).toBeInTheDocument();
  });

  it('não renderiza itens ou dados fictícios simulando arquivos do Drive', () => {
    render(<App />);
    // Garante que nenhum dos mocks removidos da PR01 ressurja na interface
    expect(screen.queryByText(/audio-taverna-ep1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/video-curta-01/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/audio-tema-01/i)).not.toBeInTheDocument();
  });
});
