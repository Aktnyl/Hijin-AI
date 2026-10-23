import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading ? 'true' : undefined}
        aria-disabled={isDisabled ? 'true' : undefined}
        className={`hijin-btn hijin-btn-${variant} hijin-btn-${size} ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontWeight: 600,
          fontFamily: 'inherit',
          borderRadius: 6,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.6 : 1,
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
          userSelect: 'none',
          position: 'relative',
          ...style,
        }}
        {...props}
      >
        {isLoading && (
          <span
            className="hijin-btn-spinner"
            aria-hidden="true"
            style={{
              width: 14,
              height: 14,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
              display: 'inline-block',
            }}
          />
        )}
        {!isLoading && leftIcon && <span className="btn-left-icon" aria-hidden="true">{leftIcon}</span>}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="btn-right-icon" aria-hidden="true">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
