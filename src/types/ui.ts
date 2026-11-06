/**
 * Contratos de Interface e Navegação — Horizon OS / Console UX
 */

/**
 * Zonas de foco ativo para controle via teclado ou toque
 */
export type NavigationZone =
  'header' | 'carousel' | 'dock' | 'explorer' | 'shortcuts' | 'adm';

/**
 * Filtros de categoria do Explorer
 */
export type ExplorerFilter = 'all' | 'folder' | 'doc' | 'media';

/**
 * Modos de visualização do Explorer
 */
export type ExplorerLayout = 'grid' | 'list';

/**
 * Preferências locais persistidas no navegador (isoladas de dados do Drive)
 */
export interface UserPreferences {
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  preferredLayout: ExplorerLayout;
}
