import type { FC } from 'react';
import { Badge } from '@/components/common/Badge';
import { ShieldCheck, CloudOff, Layers, Sparkles } from 'lucide-react';

export const HomeView: FC = () => {
  return (
    <main className="relative z-20 flex flex-1 flex-col items-center justify-center px-4 py-8 text-center sm:px-8">
      {/* Título Principal Institucional e Subtítulo */}
      <div className="max-w-3xl">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Badge variant="cyan">PR02 · Fundação Técnica</Badge>
          <Badge variant="slate">React 18 · TypeScript Estrito · Vite</Badge>
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
        aria-label="Status da Fundação Técnica"
        className="glass-pill mt-8 w-full max-w-2xl rounded-3xl p-6 sm:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
            <CloudOff className="h-8 w-8" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Google Drive Desconectado
          </h2>

          <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
            A infraestrutura técnica modular foi estabelecida com sucesso. Em
            conformidade com a regra inegociável de{' '}
            <strong className="text-white">integridade de dados</strong>, nenhum
            arquivo fictício ou pasta simulada é renderizado. A conexão
            autêntica com o Google Drive do usuário será integrada nas próximas
            PRs.
          </p>

          <div className="mt-6 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-nintendo-cyan">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold">Sem Mocks</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Arquivos e IDs inventados foram removidos da nova base de
                código.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-nintendo-cyan">
                <Layers className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold">Modular</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Separação rigorosa entre layout, auth, serviços e domínio.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-nintendo-cyan">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold">Horizon OS UX</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Design system preparado para o carrossel e efeitos de console.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roteiro Técnico Transparente */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
        <span className="font-mono text-[11px]">Próximas etapas:</span>
        <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300">
          PR03 Contratos
        </span>
        <span className="text-slate-600">→</span>
        <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300">
          PR04 Auth GIS
        </span>
        <span className="text-slate-600">→</span>
        <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300">
          PR05 Drive API Real
        </span>
      </div>
    </main>
  );
};
