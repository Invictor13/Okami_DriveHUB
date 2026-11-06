import type { FC } from 'react';
import { Home, Film, Code2, ShieldAlert } from 'lucide-react';

interface BottomDockProps {
  activeTab?: 'home' | 'multimedia' | 'programming' | 'adm';
  onTabChange?: (tab: 'home' | 'multimedia' | 'programming' | 'adm') => void;
}

export const BottomDock: FC<BottomDockProps> = ({
  activeTab = 'home',
  onTabChange,
}) => {
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'multimedia' as const, label: 'Multimídia', icon: Film },
    { id: 'programming' as const, label: 'Programação', icon: Code2 },
    { id: 'adm' as const, label: 'ADM', icon: ShieldAlert },
  ];

  return (
    <footer className="relative z-30 flex w-full flex-col items-center px-4 pb-5">
      <nav
        aria-label="Navegação do Console"
        className="glass-pill flex items-center gap-1.5 rounded-full p-2 shadow-2xl"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? 'glass-pill-active font-bold text-nintendo-cyan'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </footer>
  );
};
