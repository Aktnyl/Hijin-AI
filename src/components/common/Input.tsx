import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, errorMessage, leftIcon, rightIcon, id, className = '', style, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    const errorId = errorMessage ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`hijin-input-wrapper ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary, #9ca3af)',
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                left: 10,
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted, #94a3b8)',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={errorMessage ? 'true' : undefined}
            aria-describedby={describedBy}
            style={{
              width: '100%',
              height: 36,
              paddingLeft: leftIcon ? 34 : 12,
              paddingRight: rightIcon ? 34 : 12,
              backgroundColor: 'var(--bg-surface, #0f1218)',
              border: `1px solid ${errorMessage ? 'var(--semantic-error, #ef4444)' : 'var(--border-default, rgba(255, 255, 255, 0.08))'}`,
              borderRadius: 6,
              color: 'var(--text-primary, #f9fafb)',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            className="focus-ring-accessible"
            {...props}
          />
          {rightIcon && (
            <span
              style={{
                position: 'absolute',
                right: 10,
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted, #94a3b8)',
              }}
            >
              {rightIcon}
            </span>
          )}
        </div>
        {errorMessage && (
          <span
            id={errorId}
            role="alert"
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--semantic-error, #ef4444)',
            }}
          >
            {errorMessage}
          </span>
        )}
        {!errorMessage && helperText && (
          <span
            id={helperId}
            style={{
              fontSize: 11,
              color: 'var(--text-muted, #94a3b8)',
            }}
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
