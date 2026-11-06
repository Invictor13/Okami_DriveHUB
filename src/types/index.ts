/**
 * Ponto de exportação central de Contratos e Tipos — Okami DriveHUB
 */

export * from './drive';
export * from './auth';
export * from './sync';
export * from './ui';
export * from './bookmarks';

// Compatibilidade transitória com componentes da PR02
export type ConnectionStatus = import('./auth').AuthStatus;
export interface DriveItemReference {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}
