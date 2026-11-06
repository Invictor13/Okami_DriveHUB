# Okami DriveHUB 🐺

> Hub pessoal de navegação e produtividade de arquivos conectado ao Google Drive com estética e experiência de console inspiradas no Horizon OS (Nintendo Switch).

---

## 📌 Visão Geral

O **Okami DriveHUB** é um hub de arquivos e navegação pessoal moderno, responsivo e modular. Ele une fluidez visual, navegação otimizada por teclado e controles de console à organização de arquivos e pastas reais do usuário no Google Drive.

> [!NOTE]
> **Situação Atual da Integração (PR02):** A fundação técnica moderna (React + TypeScript + Vite + Tailwind + Vitest) está totalmente ativa e validada. A camada de integração real com o Google Drive e a autenticação oficial via Google Identity Services (GIS) serão introduzidas nas **PRs 04 e 05**. Nenhum dado simulado ou arquivo fictício é apresentado.

---

## 🛠️ Tecnologias Utilizadas

- **Core & Runtime:** [React 18](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/) (em modo estrito)
- **Build Tool:** [Vite 6](https://vite.dev/)
- **Estilização:** [Tailwind CSS v3](https://tailwindcss.com/) com PostCSS nativo (eliminando dependência de CDN)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Linter & Formatação:** [ESLint 9](https://eslint.org/) (Flat Config) & [Prettier](https://prettier.io/)
- **Testes Automatizados:** [Vitest 2](https://vitest.dev/) com [@testing-library/react](https://testing-library.com/) e `jsdom`

---

## 📋 Requisitos para Desenvolvimento

- **Node.js:** `v20.x` ou superior (`v24.x LTS` recomendada)
- **Gerenciador de Pacotes:** `npm` (`v10.x` ou `v11.x`)

> [!TIP]
> **Observação sobre Ambientes Sincronizados (Google Drive for Desktop):**
> Se o repositório estiver alocado em um disco virtual montado pelo Google Drive (`G:\...`), recomenda-se instalar dependências e executar o build fora da pasta sincronizada ou pausar temporariamente a sincronização para evitar bloqueios de arquivo do sistema operacional na pasta `node_modules`.

---

## 🚀 Instalação e Execução

### 1. Clonar o Repositório e Configurar Variáveis de Ambiente
```bash
# Copie o arquivo de exemplo de variáveis de ambiente
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
Acesse a aplicação no endereço indicado pelo terminal (geralmente `http://localhost:5173`).

### 4. Build de Produção
```bash
npm run build
```
Os artefatos otimizados e minificados serão gerados no diretório `dist/`.

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite com Hot Module Replacement (HMR). |
| `npm run build` | Executa a verificação estrita de tipos (`tsc`) e gera o bundle de produção via Vite. |
| `npm run preview` | Inicia um servidor local para inspecionar os artefatos de produção em `dist/`. |
| `npm run typecheck` | Executa a checagem de tipos estrita do TypeScript sem emitir arquivos. |
| `npm run lint` | Executa o ESLint em todo o código-fonte TypeScript/React. |
| `npm run format` | Formata o código-fonte de acordo com os padrões do Prettier. |
| `npm run format:check` | Verifica se todos os arquivos estão em conformidade com o Prettier. |
| `npm run test` | Executa a suíte de testes automatizados com o Vitest. |
| `npm run test:watch` | Executa o Vitest em modo interativo de monitoramento contínuo. |

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
│   ├── types/
│   │   └── index.ts          # Contratos estritos de domínio e tipos da aplicação
│   └── utils/
│       └── index.ts          # Funções utilitárias puras (ex.: formatação de bytes)
└── tests/
    ├── App.test.tsx          # Testes automatizados de montagem e integridade
    └── setup.ts              # Configuração do ambiente de testes com testing-library
```

---

## 🗺️ Roadmap de Evolução

- [x] **PR01 — Auditoria Técnica e Planejamento da Arquitetura**
- [x] **PR02 — Fundação Técnica, Tooling Moderno e Estrutura Modular**
- [ ] **PR03 — Camada de Tipos, Contratos e Higienização de Dados**
- [ ] **PR04 — Camada de Autenticação Segura (Google Identity Services)**
- [ ] **PR05 — Serviço de Integração Real com Google Drive API v3**
- [ ] **PR06 — Gerenciamento de Estado Reativo e Cache Local**
- [ ] **PR07 — Componentes Core e Experiência Horizon OS (Nintendo Switch UX)**
- [ ] **PR08 — Módulos Secundários (Explorer, Atalhos Web, Dashboard ADM)**
- [ ] **PR09 — Cobertura Abrangente de Testes e Pipeline CI/CD**
