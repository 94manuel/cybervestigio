'use client';

import { useEffect } from 'react';

export function BrowserProtection() {
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const rawKey = typeof event.key === 'string' ? event.key : '';
      const key = rawKey.toLowerCase();
      const usesPrimaryModifier = event.ctrlKey || event.metaKey;
      const usesInspectorShortcut =
        rawKey === 'F12' ||
        (usesPrimaryModifier && event.shiftKey && ['i', 'j', 'c', 'k'].includes(key)) ||
        (usesPrimaryModifier && key === 'u');

      if (!usesInspectorShortcut) return;

      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return null;
}