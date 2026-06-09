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
      className={`px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 ${
        variant === 'primary'
          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1'
          : variant === 'outline'
            ? 'bg-transparent border border-white/10 text-white hover:bg-white/5 hover:border-white/20'
            : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default PremiumButton;
