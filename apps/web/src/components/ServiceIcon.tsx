import type { ReactNode } from 'react';

export function ServiceIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    'hard-drive': <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 15h.01M11 15h.01"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6M11 8v6"/></>,
    'file-check': <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5"/><path d="m9 14 2 2 4-5"/></>,
    smartphone: <><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></>,
  };
  return <svg className="service-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{paths[name] ?? paths.search}</svg>;
}
