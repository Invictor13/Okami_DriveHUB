/**
 * Contexto e Provedor React de Autenticação — Okami DriveHUB
 *
 * Provê o estado reativo de autenticação para toda a árvore de componentes,
 * desacoplando a interface dos detalhes internos da Google Identity Services.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type FC,
  type ReactNode,
} from 'react';
import { AuthContextValue, AuthError, AuthSession } from '@/types/auth';
import {
  isGoogleClientConfigured,
  requestGoogleLogin,
  logoutGoogleSession,
} from './googleAuthService';
import * as tokenStore from './tokenStore';

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<AuthSession>({
    status: 'disconnected',
  });
  const [error, setError] = useState<AuthError | null>(null);
  const isConfigured = isGoogleClientConfigured();

  // Monitoramento do ciclo de vida da expiração do token em memória
  useEffect(() => {
    if (session.status !== 'connected' || !session.expiresAt) {
      return;
    }

    const timeUntilExpiry = session.expiresAt - Date.now();

    if (timeUntilExpiry <= 0) {
      // Já expirou
      tokenStore.clearToken();
      setSession({ status: 'disconnected' });
      setError({
        code: 'token_expired',
        message:
          'Sua sessão de acesso expirou. Conecte-se novamente para continuar.',
      });
      return;
    }

    // Configura o temporizador para a expiração da sessão
    const timer = setTimeout(() => {
      tokenStore.clearToken();
      setSession({ status: 'disconnected' });
      setError({
        code: 'token_expired',
        message:
          'Sua sessão de acesso expirou. Conecte-se novamente para continuar.',
      });
    }, timeUntilExpiry);

    return () => clearTimeout(timer);
  }, [session.status, session.expiresAt]);

  const login = useCallback(async () => {
    setError(null);
    setSession((prev) => ({ ...prev, status: 'connecting' }));

    try {
      const newSession = await requestGoogleLogin();
      setSession(newSession);
    } catch (err) {
      const authErr = err as AuthError;
      setError(authErr);
      setSession({ status: 'error' });
    }
  }, []);

  const logout = useCallback(async () => {
    setError(null);
    try {
      const disconnectedSession = await logoutGoogleSession();
      setSession(disconnectedSession);
    } catch {
      setSession({ status: 'disconnected' });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        error,
        isConfigured,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook de conveniência para acessar o contexto de autenticação do Okami DriveHUB.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      'useAuth deve ser utilizado dentro de um <AuthProvider />.'
    );
  }
  return context;
}
