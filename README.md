# Okami DriveHUB 🐺

> Hub pessoal de navegação e produtividade de arquivos conectado ao Google Drive com estética e experiência de console inspiradas no Horizon OS (Nintendo Switch).

---

## 📌 Visão Geral

O **Okami DriveHUB** é um hub de arquivos e navegação pessoal moderno, responsivo e modular. Ele une fluidez visual, navegação otimizada por teclado e controles de console à organização de arquivos e pastas reais do usuário no Google Drive.

> [!NOTE]
> **Situação Atual da Integração (PR05):** A primeira integração funcional com a **Google Drive API v3** foi concluída com sucesso. A listagem de arquivos, pastas e atalhos reais em modo estrito de leitura (`drive.metadata.readonly`), navegação em profundidade com breadcrumbs e paginação contínua (`nextPageToken`) está plenamente operacional. Nenhum dado simulado ou arquivo fictício é apresentado.

---

## 🛠️ Tecnologias Utilizadas

- **Core & Runtime:** [React 18](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/) (em modo estrito)
- **Validação em Tempo de Execução:** [Zod 3](https://zod.dev/)
- **Build Tool:** [Vite 6](https://vite.dev/)
- **Estilização:** [Tailwind CSS v3](https://tailwindcss.com/) com PostCSS nativo (eliminando dependência de CDN)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Linter & Formatação:** [ESLint 9](https://eslint.org/) (Flat Config) & [Prettier](https://prettier.io/)
- **Testes Automatizados:** [Vitest 2](https://vitest.dev/) com [@testing-library/react](https://testing-library.com/) e `jsdom`

---

## 🏛️ Modelos de Domínio e Contratos (PR03)

Os contratos de dados foram estruturados em módulos desacoplados dentro de `src/types/`:

### 1. Google Drive (`src/types/drive.ts`)

Modelagem dos metadados oficiais retornados pela API v3 do Google Drive:

- **`DriveFile`**: Metadados canônicos de arquivos (`id`, `name`, `mimeType`, `size`, `parents`, `webViewLink`, `thumbnailLink`, `trashed`, `capabilities`, etc.).
- **`DriveFolder`**: Especialização para pastas (`mimeType: 'application/vnd.google-apps.folder'`).
- **`DriveShortcut`**: Especialização para atalhos do Drive, com `shortcutDetails` contendo `targetId` e `targetMimeType`.
- **`DriveItem`**: União discriminada (`DriveFolder | DriveShortcut | DriveFile`).
- **`DriveListResponse`**: Payload paginado oficial de `files.list` (`nextPageToken`, `files: DriveItem[]`).
- **`DriveApiError`**: Erro estruturado oficial retornado pela API do Google (`code`, `message`, `errors`).

> [!IMPORTANT]
> **IDs Opacos Canônicos:** O identificador retornado pelo Google Drive é tratado como um identificador opaco. Não impomos regras arbitrárias (numéricas ou prefixos), preservando rigorosamente o ID canônico original.

### 2. Autenticação (`src/types/auth.ts`)

- **`AuthStatus`**: `'disconnected' | 'connecting' | 'connected' | 'error'`.
- **`TokenMetadata`**: Metadados de sessão mantidos exclusivamente em memória volátil durante a execução.
- **`AuthSession`** & **`AuthError`**: Contratos preparados para o Google Identity Services (GIS).

### 3. Sincronização (`src/types/sync.ts`)

- **`SyncStatus`**: `'disconnected' | 'idle' | 'loading' | 'syncing' | 'synchronized' | 'error'`.
- **`SyncState`**: Estado reativo com timestamp `lastSyncedAt`, contagem de itens e tratamento de erro (`SyncError`).

### 4. Interface e Preferências Locais (`src/types/ui.ts` & `src/types/bookmarks.ts`)

- **`BookmarkItem`**: Atalhos web do usuário (Speed Dial local), claramente diferenciados de arquivos do Drive.
- **`UserPreferences`**: Tema (dark/light), áudio ativado e layout preferido do Explorer.

---

## 🔐 Autenticação Segura com Google Identity Services (PR04)

O **Okami DriveHUB** adota a biblioteca oficial **Google Identity Services (GIS)** utilizando o **OAuth 2.0 Token Model** para Single Page Applications (SPAs).

### 1. Princípio do Menor Privilégio e Escopos Solicitados

A autorização solicita exclusivamente os escopos essenciais para identificação do usuário e visualização de metadados:

| Escopo                                                    | Finalidade Técnica                                | Permissões Concedidas                                                                                                            |
| :-------------------------------------------------------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------- |
| `openid`                                                  | Identificação segura da conta                     | ID de autenticação do Google                                                                                                     |
| `email`                                                   | Identificação cadastral do usuário                | Endereço de e-mail verificado                                                                                                    |
| `profile`                                                 | Apresentação personalizada                        | Nome e foto do perfil                                                                                                            |
| `https://www.googleapis.com/auth/drive.metadata.readonly` | Leitura estrita de metadados de arquivos e pastas | Apenas nomes, tipos MIME, tamanhos e IDs. **Sem acesso ao conteúdo binário e sem permissão de gravação, exclusão ou alteração.** |

> [!IMPORTANT]
> **Zero Permissões de Escrita:** O Okami DriveHUB não solicita o escopo completo `drive` nem escopos de criação/modificação (`drive.file`). O usuário mantém controle total e seus arquivos nunca são alterados.

### 2. Estratégia de Segurança dos Tokens

A segurança dos tokens de acesso segue uma política rígida de **tolerância zero** para vazamento de credenciais:

- **Tokens Exclusivamente em Memória (RAM):** O access token é mantido apenas em variáveis voláteis do módulo [`tokenStore.ts`](src/services/auth/tokenStore.ts).
- **Sem Persistência:** O token **nunca** é gravado em `localStorage`, `sessionStorage`, `IndexedDB`, cookies ou URLs.
- **Prevenção de Vazamento em Logs:** O token nunca é impresso no console ou incluído em mensagens de erro.
- **Controle de Expiração Ativo:** O tempo limite do token (geralmente 3599 segundos) é rastreado com margem de segurança de 30 segundos. Ao expirar, o token é descartado e a interface notifica o usuário.
- **Revogação no Logout:** Ao desconectar, o aplicativo invoca `google.accounts.oauth2.revoke()` para invalidar o token nos servidores da Google antes de limpar a memória local.
- **Sem Client Secret:** O frontend utiliza exclusivamente o Client ID público. O Client Secret nunca é exigido nem deve ser inserido no código.

### 3. Como Configurar o Google Cloud Console

Para habilitar a autenticação no seu ambiente local e na URL pública do GitHub Pages:

#### Passo 1: Criar o Projeto e Ativar a API

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um novo projeto ou selecione um existente (ex.: `Okami-DriveHUB`).
3. Vá em **APIs e Serviços > Biblioteca**.
4. Pesquise por **Google Drive API** e clique em **Ativar**.

#### Passo 2: Configurar a Tela de Consentimento OAuth

1. Vá em **APIs e Serviços > Tela de consentimento OAuth**.
2. Selecione o tipo de usuário: **Externo** (ou Interno para Google Workspace).
3. Preencha as informações obrigatórias:
   - Nome do aplicativo: `Okami DriveHUB`
   - E-mail de suporte do usuário: seu e-mail
   - Dados de contato do desenvolvedor: seu e-mail
4. Na etapa **Escopos**, adicione:
   - `.../auth/drive.metadata.readonly`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. Na etapa **Usuários de teste**, adicione a sua própria conta Google pessoal que você usará para testar a aplicação.

#### Passo 3: Criar as Credenciais OAuth 2.0

1. Vá em **APIs e Serviços > Credenciais > Criar Credenciais > ID do cliente OAuth**.
2. Selecione o **Tipo de aplicativo:** `Aplicativo da Web` (Web Application).
3. Defina o Nome: `Okami DriveHUB Frontend`.
4. Em **Origens JavaScript autorizadas** (Authorized JavaScript origins), adicione:
   - `http://localhost:5173` (Ambiente de desenvolvimento padrão do Vite)
   - `http://localhost:4173` (Ambiente de preview local do Vite)
   - `https://invictor13.github.io` (URL oficial publicada no GitHub Pages)
5. Em **URIs de redirecionamento autorizados**: Deixe em branco (o GIS Token Model utiliza popups com comunicação via `postMessage`, dispensando redirecionamento de URL).
6. Clique em **Criar** e copie o **ID do cliente** gerado (formato `*.apps.googleusercontent.com`).

#### Passo 4: Configurar o Arquivo `.env.local`

Na raiz do projeto local, crie o arquivo `.env.local` (ignorado pelo Git):

```bash
VITE_GOOGLE_CLIENT_ID=seu_client_id_aqui.apps.googleusercontent.com
```

### 4. Limitações do Modelo no Navegador

- **Duração do Token:** Os tokens de acesso emitidos pelo fluxo implícito do Google Identity Services expiram em 1 hora.
- **Ausência de Refresh Tokens em SPAs:** Por diretrizes de segurança da especificação OAuth 2.0 para clientes públicos (navegadores sem backend), refresh tokens de longa duração não são emitidos no frontend.
- **Reautenticação:** Quando a sessão expira, a aplicação transita suavemente para o estado desconectado e o usuário pode reautenticar clicando no botão "Conectar Conta Google".

---

## 📁 Integração Real com Google Drive API v3 (PR05)

O **Okami DriveHUB** consome diretamente a **Google Drive API v3** oficial em modo **estrito de leitura** (`drive.metadata.readonly`), permitindo a exploração de arquivos, pastas e atalhos reais da conta conectada.

### 1. Endpoint e Parâmetros Utilizados

A consulta de recursos é centralizada em [`src/services/drive/driveApiService.ts`](src/services/drive/driveApiService.ts):

- **Endpoint Oficial:** `https://www.googleapis.com/drive/v3/files` (`files.list`)
- **Cabeçalhos:**
  - `Authorization: Bearer <access_token>` (injetado exclusivamente em tempo de execução via [`tokenStore`](src/services/auth/tokenStore.ts)).
  - `Accept: application/json`.
- **Filtro de Consulta (`q`):**
  - Diretório Raiz: `'root' in parents and trashed = false`
  - Subpastas: `'<FOLDER_ID>' in parents and trashed = false` (onde `<FOLDER_ID>` é o ID canônico opaco do Drive).
- **Campos Solicitados (`fields`):**
  `nextPageToken, incompleteSearch, files(id, name, mimeType, parents, createdTime, modifiedTime, size, webViewLink, webContentLink, iconLink, thumbnailLink, trashed, shared, driveId, version, capabilities, shortcutDetails)`
- **Ordenação (`orderBy`):** `'folder, name'` (agrupa pastas no topo, seguidas por ordem alfabética).
- **Shared Drives:** `supportsAllDrives=true` e `includeItemsFromAllDrives=true` para garantir compatibilidade com itens e diretórios compartilhados.

### 2. Navegação em Profundidade e Suporte a Atalhos

- **Navegação por Breadcrumbs:** A trilha de diretórios é mantida em memória (`folderStack`), permitindo avançar em pastas filhas e retornar a qualquer nível anterior com um clique.
- **Identificação Canônica Opaca:** Os identificadores de pastas e arquivos são tratados estritamente como strings opacas originais do Google Drive. Jamais são inferidos ou gerados artificialmente.
- **Atalhos do Google Drive (`application/vnd.google-apps.shortcut`):** Mapeados através do contrato `shortcutDetails`, preservando o `targetId` e o `targetMimeType` do item de destino sem confundir o ID do atalho com o ID do alvo.

### 3. Paginação Real com `nextPageToken`

- Quando uma pasta possui mais itens do que o limite da página (`pageSize: 50`), a API retorna um `nextPageToken`.
- O hook [`useDriveFiles`](src/services/drive/useDriveFiles.ts) armazena o token e disponibiliza a ação `loadNextPage()`.
- Os novos itens são anexados à lista existente com **deduplicação por ID canônico**, garantindo ausência de itens duplicados na interface.
- Caso ocorra uma falha de rede durante o carregamento de uma página subsequente, os itens já visualizados são preservados.

### 4. Tratamento de Erros e Resiliência da Sessão

| Status HTTP / Erro             | Diagnóstico Técnico                                | Comportamento da Aplicação                                                                                                                        |
| :----------------------------- | :------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **HTTP 401 Unauthorized**      | Token de acesso expirado ou revogado               | O token é imediatamente descartado de [`tokenStore`](src/services/auth/tokenStore.ts) e a sessão é deslogada com convite amigável para reconexão. |
| **HTTP 403 Forbidden**         | Permissão insuficiente ou taxa de limite atingida  | Alerta visual de acesso negado sem expor mensagens confidenciais da API.                                                                          |
| **HTTP 404 Not Found**         | Pasta ou arquivo não encontrado                    | Alerta informando que o diretório não existe mais no Drive.                                                                                       |
| **HTTP 429 Too Many Requests** | Excesso temporário de requisições                  | Notificação amigável de limitação de taxa com opção de tentar novamente.                                                                          |
| **HTTP 5xx Server Error**      | Indisponibilidade temporária dos servidores Google | Notificação de falha nos servidores da Google com botão de recarregar.                                                                            |
| **Falha de Rede**              | Sem conexão à internet                             | Notificação de falha de conexão marcada como `retryable`.                                                                                         |
| **Validação Zod**              | Resposta violando contratos de domínio             | Rejeição imediata antes de poluir o estado da aplicação.                                                                                          |

### 5. Tratamento Fiel do Tamanho (`size`)

A Google Drive API v3 representa o tamanho de arquivos como strings numéricas inteiras de 64 bits (`int64`), omitindo o campo para pastas e documentos nativos do Google Workspace. O contrato [`DriveFile`](src/types/drive.ts) e o validador [`DriveSizeSchema`](src/utils/validators.ts) tratam o campo com máxima precisão:

- Aceita strings numéricas int64 e converte inteiros não-negativos em strings.
- Rejeita categoricamente números negativos e strings não-numéricas.
- Preserva valores maiores que `Number.MAX_SAFE_INTEGER` sem perda silenciosa de precisão.
- [`formatBytes()`](src/utils/formatters.ts) converte valores de forma segura para apresentação humana legível (B, KB, MB, GB, TB, PB), exibindo `—` para pastas e arquivos nativos.

---

## 🛡️ Estratégia de Validação e Sanitização

### Validação em Tempo de Execução (`src/utils/validators.ts`)

A tipagem estática do TypeScript opera em tempo de compilação. Para garantir que dados corrompidos ou payloads maliciosos recebidos pela rede não quebrem a aplicação:

- Implementação de Schemas [Zod](https://zod.dev/) (`DriveItemSchema`, `DriveListResponseSchema`, `DriveApiErrorSchema`).
- Método seguro `validateDriveItem(raw)` que valida campos obrigatórios, rejeita IDs vazios e extrai dados tipados.
- Type guards nativos (`isDriveFolder`, `isDriveShortcut`) e resolvedor semântico (`resolveItemKind`).

### Sanitização e Defesa contra XSS (`src/utils/sanitizers.ts`)

- **`sanitizeFileName(name)`**: Remove caracteres de controle não imprimíveis, remove tags HTML completas (`<script>`, `<b>`, etc.), normaliza Unicode em formato NFC e apara espaços sem truncar nomes legítimos.
- **`sanitizeHtmlText(input)`**: Escapa entidades HTML (`&`, `<`, `>`, `"`, `'`) para prevenir injeção em qualquer contexto de renderização.
- **`sanitizeUrl(url)`**: Aceita estritamente protocolos seguros (`https:`, `http:`). Rejeita categoricamente esquemas perigosos como `javascript:`, `data:`, `vbscript:` e `file:`.
- **`validateCanonicalId(id)`**: Assegura a integridade do ID opaco retornado pelo Drive, rejeitando identificadores vazios.

---

## 🔒 Separação de Dados: Reais vs. Locais vs. Teste

| Categoria                   | Origem                         | Identificação                             | Localização no Código                                    |
| :-------------------------- | :----------------------------- | :---------------------------------------- | :------------------------------------------------------- |
| **Arquivos Reais do Drive** | Google Drive API v3            | ID opaco canônico (ex.: `1i-cuf6nPH...`)  | `src/types/drive.ts` / `src/services/drive/`             |
| **Dados Locais do Usuário** | `localStorage` / `IndexedDB`   | Prefixo local (ex.: `bm-local-...`)       | `src/types/bookmarks.ts`, `src/types/ui.ts`              |
| **Dados de Teste / Mocks**  | Fixtures sintéticas            | Isolados no ambiente de testes            | `tests/mocks/driveMocks.ts` (nunca importados em `src/`) |
| **Legado Original**         | `Drive_Hub_Atualizado_v6.html` | Arquivo monolítico mantido como histórico | Preservado intacto na raiz (não utilizado na nova SPA)   |

---

## 📋 Requisitos para Desenvolvimento

- **Node.js:** `v20.x` ou superior (`v24.x LTS` recomendada)
- **Gerenciador de Pacotes:** `npm` (`v10.x` ou `v11.x`)

> [!TIP]
> **Ambientes Sincronizados (Google Drive for Desktop):**
> Se o repositório estiver alocado em um disco virtual montado pelo Google Drive (`G:\...`), instale dependências e execute comandos de build/test em workspace local ou pause a sincronização temporariamente para evitar conflitos de file-locking no diretório `node_modules`.

---

## 🚀 Instalação e Execução

### 1. Clonar o Repositório e Configurar Variáveis de Ambiente

```bash
cp .env.example .env.local
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Executar em Modo de Desenvolvimento

```bash
npm run dev
```

### 4. Build de Produção

```bash
npm run build
```

---

## 🌐 Publicação e Deploy no GitHub Pages

O **Okami DriveHUB** está configurado para compilação e deploy contínuo (CI/CD) automatizado no GitHub Pages através do GitHub Actions.

- **URL Pública Oficial:** [https://invictor13.github.io/Okami_DriveHUB/](https://invictor13.github.io/Okami_DriveHUB/)
- **Workflow de Deploy:** [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

### Como Funciona a Publicação

1. **Pipeline Automatizado:** A cada `push` na branch `main` (ou disparo manual via `workflow_dispatch`), o GitHub Actions executa uma esteira completa de validação:
   - Instalação limpa de dependências com `npm ci`
   - Verificação estrita de tipos com `npm run typecheck` (`tsc --noEmit`)
   - Análise estática com `npm run lint` (`eslint .`)
   - Suíte de testes automatizados com `npm run test` (`vitest run`)
   - Verificação de conformidade de código com `npm run format:check` (`prettier --check`)
   - Compilação estática de produção com `npm run build` (`vite build`)
2. **Artefato Publicado Exclusivo:** O deploy publica **exclusivamente** os arquivos estáticos gerados na pasta `dist/` através das actions oficiais `actions/upload-pages-artifact` e `actions/deploy-pages`. O código-fonte de desenvolvimento, testes e arquivos de ambiente não são expostos.
3. **Caminho Base (`base`):** O Vite está configurado com `base: '/Okami_DriveHUB/'` no `vite.config.ts`, assegurando que scripts, estilos e recursos estáticos sejam resolvidos perfeitamente no domínio do GitHub Pages.
4. **Monitoramento:** O status de cada compilação e publicação pode ser acompanhado diretamente na aba **Actions** do repositório no GitHub.

> [!WARNING]
> **Por que abrir o `index.html` com duplo clique no Windows não funciona?**
> O Okami DriveHUB é uma Single Page Application (SPA) moderna baseada em **módulos ECMAScript (ESM)** e arquitetura de build. Se você tentar abrir o arquivo `index.html` (seja o da raiz ou o gerado em `dist/`) diretamente pelo Windows Explorer via protocolo `file://`, o navegador bloqueará o carregamento dos scripts por políticas de segurança CORS e não resolverá os caminhos configurados (`/Okami_DriveHUB/assets/...`).
>
> Para executar ou inspecionar localmente:
>
> - **Ambiente de Desenvolvimento:** Execute `npm run dev` e acesse o servidor HMR local.
> - **Pré-visualização do Pacote de Produção:** Execute `npm run build` seguido de `npm run preview`.

---

## 📜 Scripts Disponíveis

| Comando                | Descrição                                                                       |
| :--------------------- | :------------------------------------------------------------------------------ |
| `npm run dev`          | Inicia o servidor de desenvolvimento do Vite com HMR.                           |
| `npm run build`        | Executa checagem de tipos estrita (`tsc`) e gera o bundle de produção via Vite. |
| `npm run preview`      | Inicia servidor local para inspecionar os artefatos de produção em `dist/`.     |
| `npm run typecheck`    | Executa a checagem de tipos estrita do TypeScript sem emitir arquivos.          |
| `npm run lint`         | Executa o ESLint em todo o código-fonte TypeScript/React.                       |
| `npm run format`       | Formata o código-fonte de acordo com os padrões do Prettier.                    |
| `npm run format:check` | Verifica se todos os arquivos estão em conformidade com o Prettier.             |
| `npm run test`         | Executa a suíte de testes automatizados com o Vitest.                           |
| `npm run test:watch`   | Executa o Vitest em modo interativo de monitoramento contínuo.                  |

---

## 📂 Estrutura de Diretórios

```text
Okami_DriveHUB/
├── .env.example              # Modelo de variáveis de ambiente (placeholders seguros)
├── .gitignore                # Proteção contra commit de dependências e segredos
├── .prettierignore           # Arquivos ignorados pelo Prettier
├── .prettierrc               # Configuração de formatação do código
├── Drive_Hub_Atualizado_v6.html  # [Preservado] Arquivo monolítico original de referência
├── eslint.config.js          # Configuração moderna do ESLint 9
├── index.html                # Ponto de entrada HTML do Vite
├── package.json              # Dependências e scripts do projeto
├── postcss.config.js         # Configuração do PostCSS para Tailwind
├── tailwind.config.js        # Tokens de cores, animações e fontes do design system
├── tsconfig.json             # Compilador TypeScript com strict: true e aliases @/*
├── vite.config.ts            # Configuração do Vite para React e aliases
├── vitest.config.ts          # Configuração do Vitest com jsdom e setupFiles
├── src/
│   ├── App.tsx               # Orquestrador de layout e zonas de navegação
│   ├── main.tsx              # Bootstrap da aplicação no DOM
│   ├── vite-env.d.ts         # Tipagem estrita de variáveis de ambiente do Vite
│   ├── auth/                 # Camada de autenticação re-exportada
│   ├── components/
│   │   ├── common/           # Componentes atômicos reutilizáveis (Badge, ErrorBoundary)
│   │   ├── layout/           # Componentes estruturais (SystemHeader, BottomDock)
│   │   ├── explorer/         # [PR05] Navegador de arquivos e pastas reais do Drive
│   │   │   └── DriveExplorer.tsx # Trilha de pastas, listagem real e paginação
│   │   ├── carousel/         # [PR07] Carrossel estilo console e cards
│   │   └── adm/              # [PR08] Métricas e dashboard administrativo
│   ├── pages/
│   │   └── HomeView.tsx      # Palco central institucional e de estado de conexão
│   ├── services/
│   │   ├── auth/             # Serviço oficial Google Identity Services (GIS)
│   │   │   ├── authContext.tsx   # Contexto e hook useAuth()
│   │   │   ├── gisLoader.ts      # Carregamento seguro da biblioteca oficial GIS
│   │   │   ├── googleAuthService.ts # OAuth 2.0 Token Client e perfil
│   │   │   └── tokenStore.ts     # Armazenamento de tokens em memória volátil (RAM)
│   │   ├── drive/            # [PR05] Cliente HTTP oficial da Google Drive API v3
│   │   │   ├── driveApiService.ts # Cliente de requisições autenticadas (files.list)
│   │   │   └── useDriveFiles.ts   # Hook de paginação, navegação e sincronização
│   │   ├── audio/            # [PR07] Sintetizador Web Audio API estilo console
│   │   ├── canvas/           # [PR07] Partículas e ondas interativas a 60 FPS
│   │   └── storage/          # [PR06] Adaptadores de armazenamento local e cache
│   ├── store/                # [PR06] Gerenciamento de estado global desacoplado
│   ├── styles/
│   │   └── index.css         # Diretivas Tailwind, variáveis CSS e efeitos glass
│   ├── types/                # Contratos estritos de domínio
│   │   ├── auth.ts           # Contratos de sessão, contexto e autenticação
│   │   ├── bookmarks.ts      # Contratos de atalhos web locais
│   │   ├── drive.ts          # Metadados e respostas oficiais do Google Drive API v3
│   │   ├── google.d.ts       # Declarações de tipos oficiais do Google Identity Services
│   │   ├── index.ts          # Exportação centralizada dos tipos
│   │   ├── sync.ts           # Estados e contratos de sincronização
│   │   └── ui.ts             # Zonas de navegação e preferências do usuário
│   └── utils/
│       ├── formatters.ts     # Utilitários de formatação de bytes e dados
│       ├── sanitizers.ts     # Funções puras de sanitização e proteção contra XSS
│       └── validators.ts     # Schemas Zod de validação (DriveSizeSchema, etc.)
└── tests/
    ├── App.test.tsx          # Testes de montagem e integridade da interface
    ├── formatters.test.ts    # Testes de formatação e conversão segura de bytes
    ├── integrity.test.ts     # Testes de integridade de dados e separação de domínio
    ├── sanitizers.test.ts    # Testes de sanitização de URLs, nomes e strings HTML
    ├── setup.ts              # Configuração do ambiente com testing-library
    ├── validators.test.ts    # Testes dos validadores Zod da Google Drive API
    ├── components/
    │   ├── AuthIntegration.test.tsx # Testes de integração de interface e auth
    │   └── DriveExplorer.test.tsx   # Testes da interface do explorador de arquivos
    ├── services/
    │   ├── driveApiService.test.ts  # Testes do cliente HTTP da Drive API v3
    │   ├── googleAuthService.test.ts # Testes do serviço GIS e fluxos OAuth
    │   ├── tokenStore.test.ts        # Testes de segurança de tokens em memória RAM
    │   └── useDriveFiles.test.ts     # Testes do hook de navegação e sincronização
    └── mocks/
        └── driveMocks.ts     # Mocks isolados exclusivamente para testes automatizados
```

---

## 🗺️ Roadmap de Evolução

- [x] **PR01 — Auditoria Técnica e Planejamento da Arquitetura**
- [x] **PR02 — Fundação Técnica, Tooling Moderno e Estrutura Modular**
- [x] **PR03 — Contratos TypeScript, Sanitização e Higienização de Dados**
- [x] **PR03.1 — Preparação e Deploy no GitHub Pages**
- [x] **PR04 — Camada de Autenticação Segura (Google Identity Services)**
- [x] **PR05 — Serviço de Integração Real com Google Drive API v3**
- [ ] **PR06 — Gerenciamento de Estado Reativo e Cache Local**
- [ ] **PR07 — Componentes Core e Experiência Horizon OS (Nintendo Switch UX)**
- [ ] **PR08 — Módulos Secundários (Explorer, Atalhos Web, Dashboard ADM)**
- [ ] **PR09 — Cobertura Abrangente de Testes e Pipeline CI/CD**
