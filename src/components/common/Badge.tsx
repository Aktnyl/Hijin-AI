import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  isTabular?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  icon,
  isTabular = false,
  children,
  className = '',
  style,
  ...props
}) => {
  return (
    <span
      className={`hijin-badge hijin-badge-${variant} hijin-badge-${size} ${isTabular ? 'tabular-nums' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontWeight: 600,
        borderRadius: 9999,
        lineHeight: 1,
        letterSpacing: '0.02em',
        userSelect: 'none',
        ...style,
      }}
      {...props}
    >
      {icon && <span className="badge-icon" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
