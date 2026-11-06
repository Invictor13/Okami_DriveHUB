import type { FC } from 'react';
import { Badge } from '@/components/common/Badge';
import { useAuth } from '@/services/auth';
import {
  ShieldCheck,
  CloudOff,
  Layers,
  Sparkles,
  LogIn,
  LogOut,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export const HomeView: FC = () => {
  const { session, error, isConfigured, login, logout, clearError } = useAuth();

  return (
    <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:px-8">
      {/* Título Principal Institucional e Subtítulo */}
      <div className="max-w-3xl">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="cyan">PR04 · Autenticação Segura</Badge>
          <Badge variant="slate">Google Identity Services (GIS)</Badge>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          Okami <span className="text-nintendo-cyan">DriveHUB</span>
        </h1>
        <p className="mt-3 text-sm font-medium text-slate-400 sm:text-base">
          Hub pessoal de gerenciamento e navegação de arquivos, projetado com
          experiência fluida inspirada em interfaces modernas de consoles.
        </p>
      </div>

      {/* Cartão Central: Estado Legítimo de Conexão e Integridade dos Dados */}
      <section
        aria-label="Status da Autenticação e Conexão com Google Drive"
        className="glass-pill mt-8 w-full max-w-2xl rounded-3xl p-6 sm:p-8"
      >
        <div className="flex flex-col items-center text-center">
          {session.status === 'connected' ? (
            /* ==============================================================
               ESTADO: CONECTADO (Conta Google Autenticada)
               ============================================================== */
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
                {session.userPicture ? (
                  <img
                    src={session.userPicture}
                    alt={session.userName || 'Avatar'}
                    className="h-14 w-14 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <CheckCircle2 className="h-8 w-8" />
                )}
              </div>

              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Conta Google Conectada
              </h2>

              <p className="mt-1 font-mono text-xs text-nintendo-cyan">
                {session.userEmail || 'Sessão Ativa'}
              </p>

              <p className="mt-3 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                Autenticação estabelecida com sucesso via{' '}
                <strong className="text-white">Google Identity Services</strong>{' '}
                sob o princípio do menor privilégio (somente leitura de
                metadados). Conforme a regra de{' '}
                <strong className="text-white">integridade de dados</strong>, os
                tokens permanecem exclusivamente em memória volátil e a
                comunicação com a Google Drive API v3 será ativada na{' '}
                <strong className="text-nintendo-cyan">PR05</strong>.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-2.5 text-xs font-bold text-rose-300 transition-all hover:bg-rose-500 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Desconectar Conta Google</span>
                </button>
              </div>
            </>
          ) : session.status === 'connecting' ? (
            /* ==============================================================
               ESTADO: CONECTANDO (Aguardando resposta do GIS)
               ============================================================== */
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>

              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Conectando ao Google Drive...
              </h2>

              <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                Aguardando a conclusão da autorização no diálogo oficial do
                Google Identity Services. Por favor, conclua a autorização na
                janela aberta do navegador.
              </p>
            </>
          ) : (
            /* ==============================================================
               ESTADO: DESCONECTADO (Padrão ou Erro)
               ============================================================== */
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
                <CloudOff className="h-8 w-8" />
              </div>

              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Google Drive Desconectado
              </h2>

              {/* Mensagem de Erro, se houver */}
              {error && (
                <div
                  role="alert"
                  className="mt-4 flex w-full max-w-lg items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-left text-xs text-rose-200"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-rose-300">
                      Falha na autenticação
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
                      {error.message}
                    </p>
                  </div>
                  <button
                    onClick={clearError}
                    className="text-xs text-rose-400 hover:text-white"
                    title="Fechar aviso de erro"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Alerta de Client ID ausente */}
              {!isConfigured && !error && (
                <div className="mt-4 flex w-full max-w-lg items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-left text-xs text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-300">
                      Client ID do Google não configurado
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
                      Para autenticar com o Google Drive real, configure a
                      variável{' '}
                      <code className="font-mono text-white">
                        VITE_GOOGLE_CLIENT_ID
                      </code>{' '}
                      no arquivo <code className="text-white">.env.local</code>.
                    </p>
                  </div>
                </div>
              )}

              <p className="mt-3 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                A infraestrutura de autenticação segura via Google Identity
                Services está pronta. Em conformidade com a regra inegociável de{' '}
                <strong className="text-white">integridade de dados</strong>,
                nenhum arquivo fictício ou pasta simulada é renderizado.
              </p>

              {/* Ação de Conexão */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void login()}
                  className="flex items-center gap-2 rounded-2xl bg-nintendo-cyan px-6 py-3 text-xs font-extrabold text-slate-950 shadow-lg shadow-nintendo-cyan/25 transition-all hover:scale-105 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Conectar Conta Google</span>
                </button>
              </div>
            </>
          )}

          {/* Cartões Informativos de Arquitetura e Segurança */}
          <div className="mt-8 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-nintendo-cyan">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold">Sem Mocks</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Arquivos e pastas inexistentes jamais são inventados ou
                simulados.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-nintendo-cyan">
                <Layers className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold">Tokens em RAM</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Access tokens mantidos estritamente em memória volátil, sem
                persistência.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-nintendo-cyan">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold">Menor Privilégio</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Escopos restritos de leitura de metadados, sem permissões de
                escrita.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roteiro Técnico Transparente */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
        <span className="font-mono text-[11px]">Roteiro:</span>
        <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-mono text-[10px] text-emerald-400">
          PR01 Auditoria ✓
        </span>
        <span className="text-slate-600">→</span>
        <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-mono text-[10px] text-emerald-400">
          PR02 Fundação ✓
        </span>
        <span className="text-slate-600">→</span>
        <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-mono text-[10px] text-emerald-400">
          PR03 Contratos ✓
        </span>
        <span className="text-slate-600">→</span>
        <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-mono text-[10px] text-emerald-400">
          PR03.1 Pages ✓
        </span>
        <span className="text-slate-600">→</span>
        <span className="rounded-md border border-nintendo-cyan/40 bg-nintendo-cyan/20 px-2 py-1 font-mono text-[10px] font-bold text-nintendo-cyan">
          PR04 Auth GIS 🐺
        </span>
        <span className="text-slate-600">→</span>
        <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-400">
          PR05 Drive API
        </span>
      </div>
    </main>
  );
};
