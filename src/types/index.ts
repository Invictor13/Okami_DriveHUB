/**
 * Status legítimos de sincronização e conexão com o Google Drive
 */
export type ConnectionStatus =
  'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Zonas ativas de navegação na interface inspirada no Horizon OS
 */
export type NavigationZone =
  'header' | 'carousel' | 'dock' | 'explorer' | 'shortcuts' | 'adm';

/**
 * Contrato inicial para itens do Google Drive (será expandido na PR03)
 */
export interface DriveItemReference {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}
