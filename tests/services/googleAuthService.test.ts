import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as authService from '@/services/auth/googleAuthService';
import * as tokenStore from '@/services/auth/tokenStore';

describe('googleAuthService — Serviço de Autenticação GIS', () => {
  beforeEach(() => {
    tokenStore.clearToken();
    authService.setGoogleClientIdOverride(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    authService.setGoogleClientIdOverride(null);
    delete (window as unknown as { google?: unknown }).google;
  });

  describe('Validação de Configuração do Google Client ID', () => {
    it('detecta quando o Client ID não está configurado ou é placeholder', () => {
      authService.setGoogleClientIdOverride(null);
      const isConfigured = authService.isGoogleClientConfigured();
      expect(typeof isConfigured).toBe('boolean');
    });

    it('rejeita a solicitação de login com código invalid_client se Client ID estiver ausente', async () => {
      authService.setGoogleClientIdOverride(null);

      await expect(authService.requestGoogleLogin()).rejects.toEqual(
        expect.objectContaining({
          code: 'invalid_client',
          message: expect.stringContaining(
            'Client ID do Google não configurado'
          ),
        })
      );
    });
  });

  describe('Princípio do Menor Privilégio e Escopos Solicitados', () => {
    it('solicita estritamente os escopos mínimos de perfil e metadados de leitura do Drive', () => {
      expect(authService.GOOGLE_SCOPES).toContain('openid');
      expect(authService.GOOGLE_SCOPES).toContain('email');
      expect(authService.GOOGLE_SCOPES).toContain('profile');
      expect(authService.GOOGLE_SCOPES).toContain(
        'https://www.googleapis.com/auth/drive.metadata.readonly'
      );

      // REGRA INEGOCIÁVEL: Não solicitar escopos amplos de escrita
      expect(authService.GOOGLE_SCOPES).not.toContain(
        'https://www.googleapis.com/auth/drive.file'
      );
      expect(authService.GOOGLE_SCOPES).not.toContain(
        'https://www.googleapis.com/auth/drive '
      );
    });
  });

  describe('Fluxo Interativo de Login (OAuth 2.0 Token Model)', () => {
    it('inicializa o cliente GIS e retorna AuthSession com perfil após autorização', async () => {
      const mockClientId = '123456789-mock.apps.googleusercontent.com';
      authService.setGoogleClientIdOverride(mockClientId);

      const fakeAccessToken = 'mock-access-token-success-xyz';

      // Mock da requisição fetch ao endpoint userinfo da Google
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'google-sub-12345',
          name: 'Victor Viana',
          email: 'victor.viana@example.com',
          picture: 'https://lh3.googleusercontent.com/mock-avatar.png',
        }),
      } as unknown as Response);

      let registeredCallback:
        ((response: google.accounts.oauth2.TokenResponse) => void) | undefined;
      const requestAccessTokenMock = vi.fn(() => {
        // Simula a resposta assíncrona do diálogo do Google
        if (registeredCallback) {
          registeredCallback({
            access_token: fakeAccessToken,
            expires_in: '3600',
            scope: authService.GOOGLE_SCOPES,
            token_type: 'Bearer',
          });
        }
      });

      // Mock da biblioteca GIS no window
      window.google = {
        accounts: {
          oauth2: {
            initTokenClient: vi.fn((config) => {
              registeredCallback = config.callback;
              return {
                requestAccessToken: requestAccessTokenMock,
              };
            }),
            revoke: vi.fn((_token, done) => done?.()),
            hasGrantedAllScopes: vi.fn(() => true),
            hasGrantedAnyScope: vi.fn(() => true),
          },
        },
      };

      const session = await authService.requestGoogleLogin();

      expect(session.status).toBe('connected');
      expect(session.userEmail).toBe('victor.viana@example.com');
      expect(session.userName).toBe('Victor Viana');
      expect(session.userPicture).toBe(
        'https://lh3.googleusercontent.com/mock-avatar.png'
      );
      expect(session.expiresAt).toBeDefined();

      // Confirma que o token foi gravado exclusivamente em memória
      expect(tokenStore.getToken()).toBe(fakeAccessToken);
      expect(requestAccessTokenMock).toHaveBeenCalledWith({
        prompt: 'consent',
      });
    });

    it('trata erro quando o usuário fecha o popup do Google', async () => {
      authService.setGoogleClientIdOverride('mock-client-id');

      let registeredCallback:
        ((response: google.accounts.oauth2.TokenResponse) => void) | undefined;

      window.google = {
        accounts: {
          oauth2: {
            initTokenClient: vi.fn((config) => {
              registeredCallback = config.callback;
              return {
                requestAccessToken: vi.fn(() => {
                  registeredCallback?.({
                    access_token: '',
                    expires_in: 0,
                    token_type: '',
                    scope: '',
                    error: 'popup_closed_by_user',
                  });
                }),
              };
            }),
            revoke: vi.fn(),
            hasGrantedAllScopes: vi.fn(() => false),
            hasGrantedAnyScope: vi.fn(() => false),
          },
        },
      };

      await expect(authService.requestGoogleLogin()).rejects.toEqual(
        expect.objectContaining({
          code: 'popup_closed',
          message: expect.stringContaining('fechada antes da conclusão'),
        })
      );

      // Garante que nenhum token foi salvo
      expect(tokenStore.getToken()).toBeNull();
    });

    it('trata erro quando o usuário recusa o consentimento (access_denied)', async () => {
      authService.setGoogleClientIdOverride('mock-client-id');

      window.google = {
        accounts: {
          oauth2: {
            initTokenClient: vi.fn((config) => ({
              requestAccessToken: vi.fn(() => {
                config.callback?.({
                  access_token: '',
                  expires_in: 0,
                  token_type: '',
                  scope: '',
                  error: 'access_denied',
                });
              }),
            })),
            revoke: vi.fn(),
            hasGrantedAllScopes: vi.fn(() => false),
            hasGrantedAnyScope: vi.fn(() => false),
          },
        },
      };

      await expect(authService.requestGoogleLogin()).rejects.toEqual(
        expect.objectContaining({
          code: 'access_denied',
          message: expect.stringContaining('Acesso não concedido'),
        })
      );
    });
  });

  describe('Desconexão e Revogação de Sessão', () => {
    it('revoga o token junto à Google e limpa a memória volátil ao desconectar', async () => {
      const activeToken = 'token-to-revoke-123';
      tokenStore.setToken(activeToken, 3600);
      expect(tokenStore.getToken()).toBe(activeToken);

      const revokeSpy = vi.fn((_token: string, done?: () => void) => {
        done?.();
      });

      window.google = {
        accounts: {
          oauth2: {
            initTokenClient: vi.fn(),
            revoke: revokeSpy,
            hasGrantedAllScopes: vi.fn(() => true),
            hasGrantedAnyScope: vi.fn(() => true),
          },
        },
      };

      const result = await authService.logoutGoogleSession();

      expect(result.status).toBe('disconnected');
      expect(revokeSpy).toHaveBeenCalledWith(activeToken, expect.any(Function));
      // Garante limpeza completa da memória volátil
      expect(tokenStore.getToken()).toBeNull();
    });
  });
});
