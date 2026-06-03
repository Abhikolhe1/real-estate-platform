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
      className={`px-8 py-3.5 tracking-wider font-semibold font-label-caps text-xs transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden ${
        variant === 'primary' || variant === 'luxury'
          ? 'bg-primary text-on-primary shadow-lg shadow-primary/10 hover:shadow-primary/20 hover:scale-105 shimmer-effect'
          : variant === 'outline'
            ? 'bg-transparent border border-white/20 text-on-surface hover:border-primary/50 hover:bg-white/5'
            : 'bg-white/5 text-gray-200 hover:bg-white/10'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default PremiumButton;
