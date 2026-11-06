import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as tokenStore from '@/services/auth/tokenStore';

describe('tokenStore — Armazenamento de Tokens em Memória Volátil', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    vi.restoreAllMocks();
  });

  it('inicia sem nenhum token em memória', () => {
    expect(tokenStore.getToken()).toBeNull();
    expect(tokenStore.hasValidToken()).toBe(false);
    expect(tokenStore.getExpiresAt()).toBeNull();
    expect(tokenStore.isTokenExpired()).toBe(true);
  });

  it('armazena e recupera o access token com segurança em memória', () => {
    const fakeToken = 'mock-oauth-token-test-12345';
    tokenStore.setToken(fakeToken, 3600);

    expect(tokenStore.getToken()).toBe(fakeToken);
    expect(tokenStore.hasValidToken()).toBe(true);
    expect(tokenStore.isTokenExpired()).toBe(false);
    expect(tokenStore.getExpiresAt()).toBeGreaterThan(Date.now());
  });

  it('limpa completamente o token da memória quando solicitado', () => {
    tokenStore.setToken('mock-oauth-token-to-clear', 3600);
    expect(tokenStore.hasValidToken()).toBe(true);

    tokenStore.clearToken();

    expect(tokenStore.getToken()).toBeNull();
    expect(tokenStore.hasValidToken()).toBe(false);
    expect(tokenStore.getExpiresAt()).toBeNull();
  });

  it('detecta tokens expirados e os invalida automaticamente', () => {
    // Configura token com validade de 0 segundos (expirado imediatamente)
    tokenStore.setToken('mock-expired-token', -10);

    expect(tokenStore.isTokenExpired()).toBe(true);
    expect(tokenStore.getToken()).toBeNull(); // getToken descarta automaticamente token expirado
    expect(tokenStore.hasValidToken()).toBe(false);
  });

  it('REGRA DE SEGURANÇA: NUNCA persiste ou consulta tokens em localStorage ou sessionStorage', () => {
    const localSetSpy = vi.spyOn(Storage.prototype, 'setItem');
    const localGetSpy = vi.spyOn(Storage.prototype, 'getItem');
    const sessionSetSpy = vi.spyOn(sessionStorage, 'setItem');
    const sessionGetSpy = vi.spyOn(sessionStorage, 'getItem');

    // Executa operações de ciclo de vida completo do token
    tokenStore.setToken('secure-in-memory-token', 3600);
    tokenStore.getToken();
    tokenStore.isTokenExpired();
    tokenStore.clearToken();

    // Garante que nenhuma API de storage persistente foi acionada
    expect(localSetSpy).not.toHaveBeenCalled();
    expect(localGetSpy).not.toHaveBeenCalled();
    expect(sessionSetSpy).not.toHaveBeenCalled();
    expect(sessionGetSpy).not.toHaveBeenCalled();
  });
});

