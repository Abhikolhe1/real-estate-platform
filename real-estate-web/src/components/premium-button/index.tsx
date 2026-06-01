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
      className={`px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${
        variant === 'primary'
          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105'
          : variant === 'outline'
            ? 'bg-transparent border border-white/10 text-white hover:bg-white/5'
            : 'bg-white/5 text-gray-200 hover:bg-white/10'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default PremiumButton;
