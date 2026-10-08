import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'reward';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: ButtonVariant;
 size?: ButtonSize;
 isLoading?: boolean;
 leftIcon?: React.ReactNode;
 rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
 variant = 'primary',
 size = 'md',
 isLoading = false,
 leftIcon,
 rightIcon,
 children,
 className = '',
 disabled,
 ...props
}, ref) => {
 const baseStyles = 'inline-flex items-center justify-center font-bold transition-colors press select-none disabled:opacity-50 disabled:pointer-events-none rounded-xl';

 const sizeStyles: Record<ButtonSize, string> = {
 sm: 'min-h-[44px] px-3.5 py-2 text-xs gap-1.5',
 md: 'h-11 px-4 text-sm gap-2 min-h-[44px]',
 lg: 'h-12 px-5 text-base gap-2.5 min-h-[48px]',
 };

 const variantStyles: Record<ButtonVariant, string> = {
 primary: 'bg-primary text-on-primary hover:opacity-95 shadow-xs hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
 secondary: 'bg-surface hover:bg-sunken text-ink-1 border border-line focus-visible:ring-2 focus-visible:ring-primary',
 ghost: 'bg-transparent hover:bg-sunken text-ink-2 hover:text-ink-1 focus-visible:ring-2 focus-visible:ring-primary',
 danger: 'bg-negative text-white hover:opacity-95 focus-visible:ring-2 focus-visible:ring-negative',
 reward: 'bg-reward-fill text-ink-1 hover:opacity-95 shadow-xs focus-visible:ring-2 focus-visible:ring-reward',
 };

 return (
 <button
 ref={ref}
 disabled={disabled || isLoading}
 className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
 {...props}
 >
 {isLoading ? (
 <Loader2 className="w-4 h-4 animate-spin text-current" />
 ) : (
 leftIcon && <span className="shrink-0">{leftIcon}</span>
 )}
 <span>{children}</span>
 {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
 </button>
 );
});

Button.displayName = 'Button';
