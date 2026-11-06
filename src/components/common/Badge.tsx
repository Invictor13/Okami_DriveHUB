import type { ReactNode, FC } from 'react';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'cyan' | 'amber' | 'emerald' | 'rose' | 'slate';
  className?: string;
}

export const Badge: FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  className = '',
}) => {
  const variantStyles = {
    cyan: 'bg-nintendo-cyan/15 text-nintendo-cyan border-nintendo-cyan/30',
    amber: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    emerald: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    slate: 'bg-white/10 text-slate-300 border-white/15',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold transition-all ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
