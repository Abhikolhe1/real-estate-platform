import React from 'react';

export interface PremiumButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'luxury';
  themeContext?: 'admin' | 'builder' | 'web';
  children: React.ReactNode;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  variant = 'primary',
  themeContext = 'web',
  children,
  className = '',
  ...props
}) => {
  let styleClasses = '';

  if (themeContext === 'admin') {
    styleClasses = `px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 ${
      variant === 'primary'
        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1'
        : variant === 'outline'
          ? 'bg-transparent border border-white/10 text-white hover:bg-white/5 hover:border-white/20'
          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-transparent'
    }`;
  } else if (themeContext === 'builder') {
    styleClasses = `px-8 py-4 rounded-2xl font-bold font-label-caps text-[10px] uppercase tracking-[0.2em] transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden ${
      variant === 'primary'
        ? 'bg-[#f2ca50] text-[#131313] shadow-xl shadow-[#f2ca50]/20 hover:shadow-[#f2ca50]/40 hover:-translate-y-1 shimmer-effect'
        : variant === 'outline'
          ? 'bg-transparent border border-white/10 text-white hover:bg-white/5 hover:border-[#f2ca50]/50'
          : 'bg-white/5 text-white/70 hover:bg-white/10 border border-transparent hover:text-white'
    }`;
  } else {
    const variantClasses =
      variant === 'primary' || variant === 'luxury'
        ? 'bg-primary text-on-primary shadow-sm hover:bg-on-surface-variant'
        : variant === 'outline'
          ? 'border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container'
          : 'border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-container-high';

    styleClasses = `relative inline-flex items-center justify-center gap-3 rounded-xl px-8 py-4 font-label-caps text-[10px] font-bold uppercase tracking-[0.2em] transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.98] motion-reduce:transform-none disabled:pointer-events-none disabled:opacity-50 ${variantClasses}`;
  }

  const combinedClass = className ? `${styleClasses} ${className}` : styleClasses;

  return (
    <button className={combinedClass} {...props}>
      {children}
    </button>
  );
};

export const ForwardedPremiumButton = PremiumButton;
export default PremiumButton;

