import React, { useEffect, useRef } from 'react';
import { CloseIcon } from './Icons';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidth?: number | string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  maxWidth = 640,
  children,
  footer,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap and keyboard handlers
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableElements).filter(
          (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
        );

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on first focusable element inside modal
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const first = modalRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const titleId = `modal-title-${Math.random().toString(36).substring(2, 9)}`;
  const descId = description ? `modal-desc-${Math.random().toString(36).substring(2, 9)}` : undefined;

  return (
    <div
      className="hijin-modal-overlay"
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="hijin-modal-card"
        style={{
          width: '100%',
          maxWidth,
          backgroundColor: 'var(--bg-surface-elevated, #141721)',
          border: '1px solid var(--border-default, rgba(255, 255, 255, 0.08))',
          borderRadius: 12,
          boxShadow: 'var(--shadow-modal, 0 24px 64px -8px rgba(0, 0, 0, 0.75))',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
          outline: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default, rgba(255, 255, 255, 0.08))',
          }}
        >
          <div>
            <h2
              id={titleId}
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-heading, #ffffff)',
                margin: 0,
              }}
            >
              {title}
            </h2>
            {description && (
              <p
                id={descId}
                style={{
                  fontSize: 12,
                  color: 'var(--text-muted, #94a3b8)',
                  margin: '4px 0 0 0',
                }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="focus-ring-accessible min-target-desktop"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              padding: 4,
            }}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            flex: 1,
            color: 'var(--text-primary, #f9fafb)',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-default, rgba(255, 255, 255, 0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
