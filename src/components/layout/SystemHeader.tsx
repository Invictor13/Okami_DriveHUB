import { useState, useEffect, type FC } from 'react';
import { Badge } from '@/components/common/Badge';
import { ExternalLink, Volume2, Moon, Wifi } from 'lucide-react';

interface SystemHeaderProps {
  connectionStatus?: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export const SystemHeader: FC<SystemHeaderProps> = ({
  connectionStatus = 'disconnected',
}) => {
  const [currentTime, setCurrentTime] = useState<string>('--:--');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative z-30 flex w-full items-center justify-between gap-4 px-6 pb-2 pt-4 sm:px-10">
      {/* Lado Esquerdo: Perfil do Usuário e Status do Drive */}
      <div className="flex items-center gap-3">
        <div className="glass-pill group flex items-center gap-3 rounded-full p-1 pr-4 shadow-md transition-all hover:border-nintendo-cyan">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 ring-2 ring-nintendo-cyan/60">
            <span className="font-mono text-xs font-bold text-nintendo-cyan">
              VV
            </span>
          </div>
          <div className="text-left">
            <p className="text-xs font-extrabold tracking-tight text-white">
              Victor Viana
            </p>
            <p className="font-mono text-[10px] text-slate-400">Okami HUB</p>
          </div>
        </div>

        {/* Status Honesto da Conexão */}
        <Badge
          variant={
            connectionStatus === 'connected'
              ? 'emerald'
              : connectionStatus === 'connecting'
                ? 'amber'
                : 'slate'
          }
          className="hidden sm:inline-flex"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {connectionStatus === 'connected'
            ? 'Drive Conectado'
            : connectionStatus === 'connecting'
              ? 'Conectando...'
              : 'Drive Desconectado (PR04)'}
        </Badge>
      </div>

      {/* Lado Direito: Acesso Rápido, Áudio, Tema e Relógio de Console */}
      <div className="flex items-center gap-2.5">
        <a
          href="https://drive.google.com/drive/my-drive"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-pill flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-200 transition-all hover:bg-white/10 hover:text-white"
          title="Abrir Meu Google Drive no navegador"
        >
          <span>Google Drive</span>
          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
        </a>

        <div className="glass-pill hidden items-center gap-2 rounded-full p-2 text-slate-400 sm:flex">
          <Volume2 className="h-4 w-4 text-nintendo-cyan" />
        </div>

        <div className="glass-pill hidden items-center gap-2 rounded-full p-2 text-slate-400 sm:flex">
          <Moon className="h-4 w-4 text-amber-400" />
        </div>

        <div className="flex items-center gap-2.5 border-l border-white/10 pl-3">
          <span
            data-testid="system-clock"
            className="font-mono text-xs font-semibold tracking-tight text-slate-300"
          >
            {currentTime}
          </span>
          <Wifi className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    </header>
  );
};
