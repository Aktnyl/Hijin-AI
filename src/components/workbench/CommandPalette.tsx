import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatIcon,
  SearchIcon,
  SettingsIcon,
  ArtifactsIcon,
  CloseIcon,
  SparklesIcon,
  CheckIcon,
} from '../common/Icons';
import { settingsStore, ThemeMode } from '../../services/settingsStore';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Action' | 'Theme' | 'System';
  shortcut?: string;
  icon: React.ReactNode;
  perform: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSearchFocus: () => void;
  onToggleSidebar: () => void;
  onToggleArtifacts: () => void;
  onOpenSettings: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNewChat,
  onSearchFocus,
  onToggleSidebar,
  onToggleArtifacts,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = useMemo(() => [
    {
      id: 'new_chat',
      title: 'New Conversation',
      category: 'Action',
      shortcut: 'Ctrl+N',
      icon: <ChatIcon size={16} />,
      perform: () => {
        onNewChat();
        onClose();
      },
    },
    {
      id: 'search_chats',
      title: 'Search Conversations & Evidence',
      category: 'Navigation',
      shortcut: 'Ctrl+F',
      icon: <SearchIcon size={16} />,
      perform: () => {
        onClose();
        onSearchFocus();
      },
    },
    {
      id: 'toggle_artifacts',
      title: 'Toggle Artifacts & Evidence Panel',
      category: 'Navigation',
      shortcut: 'Ctrl+Shift+A',
      icon: <ArtifactsIcon size={16} />,
      perform: () => {
        onToggleArtifacts();
        onClose();
      },
    },
    {
      id: 'toggle_sidebar',
      title: 'Toggle Left Sidebar Navigation',
      category: 'Navigation',
      shortcut: 'Ctrl+B',
      icon: <span style={{ fontSize: 13, fontWeight: 700 }}>◫</span>,
      perform: () => {
        onToggleSidebar();
        onClose();
      },
    },
    {
      id: 'theme_dark',
      title: 'Switch to Dark Obsidian Theme',
      category: 'Theme',
      icon: <span style={{ fontSize: 13 }}>🌙</span>,
      perform: () => {
        settingsStore.updateSettings({ theme: 'dark' });
        onClose();
      },
    },
    {
      id: 'theme_light',
      title: 'Switch to Light Slate Paper Theme',
      category: 'Theme',
      icon: <span style={{ fontSize: 13 }}>☀️</span>,
      perform: () => {
        settingsStore.updateSettings({ theme: 'light' });
        onClose();
      },
    },
    {
      id: 'theme_system',
      title: 'Use System Default Appearance',
      category: 'Theme',
      icon: <span style={{ fontSize: 13 }}>💻</span>,
      perform: () => {
        settingsStore.updateSettings({ theme: 'system' });
        onClose();
      },
    },
    {
      id: 'open_settings',
      title: 'Open Settings & Diagnostics',
      category: 'System',
      shortcut: 'Ctrl+,',
      icon: <SettingsIcon size={16} />,
      perform: () => {
        onOpenSettings();
        onClose();
      },
    },
  ], [onNewChat, onSearchFocus, onToggleSidebar, onToggleArtifacts, onOpenSettings, onClose]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].perform();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command Palette">
      <div className="command-palette-modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="command-palette-input-wrap">
          <SearchIcon size={18} className="command-palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Type a command or search actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="command-palette-esc-badge">ESC</span>
        </div>

        <div className="command-palette-list" role="listbox">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">No matching actions found</div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  className={`command-palette-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => cmd.perform()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="command-palette-item-left">
                    <span className="command-palette-item-icon">{cmd.icon}</span>
                    <span className="command-palette-item-title">{cmd.title}</span>
                  </div>
                  <div className="command-palette-item-right">
                    <span className="command-palette-item-cat">{cmd.category}</span>
                    {cmd.shortcut && (
                      <span className="command-palette-item-shortcut">{cmd.shortcut}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="command-palette-footer">
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Select with <kbd>↵ Enter</kbd></span>
          <span>Close with <kbd>Esc</kbd></span>
        </div>
      </div>
    </div>
  );
};
