# Okami DriveHUB 🐺

> Hub pessoal de navegação e produtividade de arquivos conectado ao Google Drive com estética e experiência de console inspiradas no Horizon OS (Nintendo Switch).

---

## 📌 Visão Geral

O **Okami DriveHUB** é um hub de arquivos e navegação pessoal moderno, responsivo e modular. Ele une fluidez visual, navegação otimizada por teclado e controles de console à organização de arquivos e pastas reais do usuário no Google Drive.

> [!NOTE]
> **Situação Atual da Integração (PR03):** A camada de contratos de domínio estritos, validação em tempo de execução com Zod e sanitização de segurança foi concluída. A autenticação oficial (Google Identity Services) e a comunicação HTTP com os endpoints reais da Google Drive API v3 serão implementadas nas **PRs 04 e 05**. Nenhum dado simulado ou arquivo fictício é apresentado.

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
│   ├── auth/                 # [PR04] Integração com Google Identity Services (GIS)
│   ├── components/
│   │   ├── common/           # Componentes atômicos reutilizáveis (Badge, ErrorBoundary)
│   │   ├── layout/           # Componentes estruturais (SystemHeader, BottomDock)
│   │   ├── carousel/         # [PR07] Carrossel estilo console e cards
│   │   ├── explorer/         # [PR08] Navegador de arquivos e pré-visualização
│   │   └── adm/              # [PR08] Métricas e dashboard administrativo
│   ├── pages/
│   │   └── HomeView.tsx      # Palco central institucional e de estado de conexão
│   ├── services/
│   │   ├── drive/            # [PR05] Cliente da API v3 do Google Drive
│   │   ├── audio/            # [PR07] Sintetizador Web Audio API estilo console
│   │   ├── canvas/           # [PR07] Partículas e ondas interativas a 60 FPS
│   │   └── storage/          # [PR06] Adaptadores de armazenamento local e cache
│   ├── store/                # [PR06] Gerenciamento de estado global desacoplado
│   ├── styles/
│   │   └── index.css         # Diretivas Tailwind, variáveis CSS e efeitos glass
│   ├── types/                # Contratos estritos de domínio
│   │   ├── auth.ts           # Contratos de sessão e autenticação
│   │   ├── bookmarks.ts      # Contratos de atalhos web locais
│   │   ├── drive.ts          # Metadados e respostas oficiais do Google Drive API v3
│   │   ├── index.ts          # Exportação centralizada dos tipos
│   │   ├── sync.ts           # Estados e contratos de sincronização
│   │   └── ui.ts             # Zonas de navegação e preferências do usuário
│   └── utils/
│       ├── formatters.ts     # Utilitários de formatação
│       ├── sanitizers.ts     # Funções puras de sanitização e proteção contra XSS
│       └── validators.ts     # Schemas e validadores em tempo de execução com Zod
└── tests/
    ├── App.test.tsx          # Testes de montagem e integridade da interface
    ├── integrity.test.ts     # Testes de integridade de dados e separação de domínio
    ├── sanitizers.test.ts    # Testes de sanitização de URLs, nomes e strings HTML
    ├── setup.ts              # Configuração do ambiente com testing-library
    ├── validators.test.ts    # Testes dos validadores Zod da Google Drive API
    └── mocks/
        └── driveMocks.ts     # Mocks isolados exclusivamente para testes automatizados
```

---

## 🗺️ Roadmap de Evolução

- [x] **PR01 — Auditoria Técnica e Planejamento da Arquitetura**
- [x] **PR02 — Fundação Técnica, Tooling Moderno e Estrutura Modular**
- [x] **PR03 — Contratos TypeScript, Sanitização e Higienização de Dados**
- [ ] **PR04 — Camada de Autenticação Segura (Google Identity Services)**
- [ ] **PR05 — Serviço de Integração Real com Google Drive API v3**
- [ ] **PR06 — Gerenciamento de Estado Reativo e Cache Local**
- [ ] **PR07 — Componentes Core e Experiência Horizon OS (Nintendo Switch UX)**
- [ ] **PR08 — Módulos Secundários (Explorer, Atalhos Web, Dashboard ADM)**
- [ ] **PR09 — Cobertura Abrangente de Testes e Pipeline CI/CD**
