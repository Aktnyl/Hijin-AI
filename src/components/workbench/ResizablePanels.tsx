import React, { useCallback, useEffect, useRef, useState } from 'react';
import { settingsStore } from '../../services/settingsStore';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel?: React.ReactNode;
  leftCollapsed?: boolean;
  rightCollapsed?: boolean;
  rightMaximized?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
  onToggleRightMaximized?: () => void;
}

export const ResizablePanels: React.FC<ResizablePanelsProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  leftCollapsed = false,
  rightCollapsed = false,
  rightMaximized = false,
  onToggleLeft,
  onToggleRight,
  onToggleRightMaximized,
}) => {
  const settings = settingsStore.getSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(window.innerWidth);

  // Measure dynamic width of the container on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      } else {
        setContainerWidth(window.innerWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const [leftWidth, setLeftWidth] = useState(settings.leftPanelWidth || 260);

  // Adaptive right panel width calculation: default to balanced 50% split on wide screens
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = settings.rightPanelWidth;
    if (saved && saved >= 360 && saved <= 900) return saved;
    return Math.round((window.innerWidth - 260) * 0.5);
  });

  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  // Responsive constraint rules
  const effectiveLeftWidth = leftCollapsed ? 0 : leftWidth;
  const minCenterWidth = containerWidth > 1300 ? 500 : containerWidth > 950 ? 400 : 300;
  const maxRightWidth = Math.max(340, containerWidth - effectiveLeftWidth - minCenterWidth);
  const effectiveRightWidth = Math.min(Math.max(340, rightWidth), maxRightWidth);

  const startResizingLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingLeft.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const startResizingRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currContainerWidth = rect.width;

    if (isResizingLeft.current) {
      const newWidth = Math.max(200, Math.min(380, e.clientX - rect.left));
      setLeftWidth(newWidth);
    } else if (isResizingRight.current) {
      const currentEffectiveLeft = leftCollapsed ? 0 : leftWidth;
      const currentMinCenter = currContainerWidth > 1300 ? 500 : currContainerWidth > 950 ? 400 : 300;
      const dynamicMaxRight = Math.max(340, currContainerWidth - currentEffectiveLeft - currentMinCenter);
      const newWidth = Math.max(340, Math.min(dynamicMaxRight, rect.right - e.clientX));
      setRightWidth(newWidth);
    }
  }, [leftCollapsed, leftWidth]);

  const handleMouseUp = useCallback(() => {
    if (isResizingLeft.current) {
      isResizingLeft.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      settingsStore.updateSettings({ leftPanelWidth: leftWidth });
    }
    if (isResizingRight.current) {
      isResizingRight.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      settingsStore.updateSettings({ rightPanelWidth: effectiveRightWidth });
    }
  }, [leftWidth, effectiveRightWidth]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Keyboard shortcut Ctrl+B for left sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !e.shiftKey) {
        e.preventDefault();
        if (onToggleLeft) onToggleLeft();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleLeft]);

  const showRight = Boolean(rightPanel && !rightCollapsed);

  return (
    <div
      className={`panels-split-container ${rightMaximized ? 'theater-mode-active' : ''}`}
      ref={containerRef}
    >
      {/* Left Panel */}
      {!rightMaximized && (
        <div
          className={`panel-left-wrapper ${leftCollapsed ? 'collapsed' : ''}`}
          style={{ width: leftCollapsed ? 0 : `${leftWidth}px` }}
        >
          {!leftCollapsed && leftPanel}
        </div>
      )}

      {/* Left Resizer Handle */}
      {!rightMaximized && !leftCollapsed && (
        <div
          className="panel-resizer-handle left"
          onMouseDown={startResizingLeft}
          title="Drag to resize sidebar"
        />
      )}

      {/* Center Main Stage (Hero Conversation Workspace) */}
      {!rightMaximized && (
        <div className="panel-center-wrapper">
          {centerPanel}
        </div>
      )}

      {/* Right Resizer Handle (if right inspector is active and not maximized) */}
      {showRight && !rightMaximized && (
        <div
          className="panel-resizer-handle right"
          onMouseDown={startResizingRight}
          title="Drag to resize inspector (Center workspace is protected)"
        />
      )}

      {/* Right Contextual Split Inspector / Theater Stage */}
      {showRight && (
        <div
          className={`panel-right-wrapper ${rightMaximized ? 'maximized' : ''}`}
          style={{
            width: rightMaximized ? '100%' : `${effectiveRightWidth}px`,
            flex: rightMaximized ? 1 : undefined,
          }}
        >
          {rightPanel}
        </div>
      )}
    </div>
  );
};
