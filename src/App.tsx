import { useState, type FC } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { SystemHeader } from '@/components/layout/SystemHeader';
import { BottomDock } from '@/components/layout/BottomDock';
import { HomeView } from '@/pages/HomeView';
import { ConnectionStatus } from '@/types';

export const App: FC = () => {
  const [connectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeTab, setActiveTab] = useState<
    'home' | 'multimedia' | 'programming' | 'adm'
  >('home');

  return (
    <ErrorBoundary>
      <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-console-dark text-slate-100 selection:bg-nintendo-cyan selection:text-slate-950">
        {/* Aura e Iluminação Ambiente de Fundo */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 opacity-30"
          style={{
            background:
              'radial-gradient(circle at 50% 30%, rgba(0, 210, 255, 0.25), transparent 70%)',
          }}
        />

        {/* Barra de Sistema Superior */}
        <SystemHeader connectionStatus={connectionStatus} />

        {/* Palco Principal da Aplicação */}
        <HomeView />

        {/* Dock Inferior */}
        <BottomDock activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </ErrorBoundary>
  );
};

export default App;
