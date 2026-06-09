import React from 'react';

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`px-8 py-4 rounded-2xl font-bold font-label-caps text-[10px] uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden ${
        variant === 'primary'
          ? 'bg-[#f2ca50] text-[#131313] shadow-xl shadow-[#f2ca50]/20 hover:shadow-[#f2ca50]/40 hover:-translate-y-1 shimmer-effect'
          : variant === 'outline'
            ? 'bg-transparent border border-white/10 text-white hover:bg-white/5 hover:border-[#f2ca50]/50'
            : 'bg-white/5 text-white/70 hover:bg-white/10 border border-transparent hover:text-white'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default PremiumButton;
