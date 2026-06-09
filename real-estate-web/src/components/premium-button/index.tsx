import React from 'react';

interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'luxury';
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
        variant === 'primary' || variant === 'luxury'
          ? 'bg-primary text-[#131313] shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 hover:scale-[1.02] shimmer-effect'
          : variant === 'outline'
            ? 'bg-transparent border border-white/10 text-on-surface hover:bg-white/5 hover:border-primary/50'
            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default PremiumButton;
