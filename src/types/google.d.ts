/**
 * Definições de Tipos — Google Identity Services (GIS)
 * Referência Oficial: https://developers.google.com/identity/oauth2/web/reference/js-reference
 */

declare namespace google.accounts.oauth2 {
  export interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback?: (response: TokenResponse) => void;
    error_callback?: (error: TokenClientError) => void;
    prompt?: string;
    enable_granular_consent?: boolean;
  }

  export interface OverridableTokenClientConfig {
    scope?: string;
    prompt?: string;
    hint?: string;
    enable_granular_consent?: boolean;
  }

  export interface TokenClient {
    requestAccessToken: (overrideConfig?: OverridableTokenClientConfig) => void;
  }

  export interface TokenResponse {
    access_token: string;
    expires_in: string | number;
    hd?: string;
    prompt?: string;
    token_type: string;
    scope: string;
    state?: string;
    error?: string;
    error_description?: string;
    error_uri?: string;
  }

  export interface TokenClientError {
    type: string;
    message?: string;
  }

  export function initTokenClient(config: TokenClientConfig): TokenClient;

  export function revoke(accessToken: string, done?: () => void): void;

  export function hasGrantedAllScopes(
    tokenResponse: TokenResponse,
    firstScope: string,
    ...restScopes: string[]
  ): boolean;

  export function hasGrantedAnyScope(
    tokenResponse: TokenResponse,
    firstScope: string,
    ...restScopes: string[]
  ): boolean;
}

interface Window {
  google?: {
    accounts?: {
      oauth2?: typeof google.accounts.oauth2;
    };
  };
}

