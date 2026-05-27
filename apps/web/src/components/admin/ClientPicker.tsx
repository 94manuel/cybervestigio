'use client';

import { useMemo, useState } from 'react';
import type { Client } from '@/lib/types';

type Props = {
  clients: Client[];
  fieldName: string;
  label?: string;
  defaultClientId?: string;
};

export function ClientPicker({ clients, fieldName, label = 'Buscar cliente (nombre o cedula)', defaultClientId }: Props) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(defaultClientId ?? '');

  const selectedClient = useMemo(() => clients.find((client) => client.id === selectedId) ?? null, [clients, selectedId]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 20);
    return clients
      .filter((client) => `${client.fullName} ${client.cedula}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [clients, query]);

  return (
    <div className="client-picker">
      <input type="hidden" name={fieldName} value={selectedId} readOnly />
      <label>{label}</label>
      <input
        placeholder="Ej: Ana Torres o 1020304050"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="client-picker-results">
        {filtered.map((client) => (
          <button
            className={`client-picker-option${selectedId === client.id ? ' is-selected' : ''}`}
            key={client.id}
            onClick={(event) => {
              event.preventDefault();
              setSelectedId(client.id);
              setQuery(`${client.fullName} - ${client.cedula}`);
            }}
            type="button"
          >
            <strong>{client.fullName}</strong>
            <span>{client.cedula} · {client.email}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="admin-muted">Sin coincidencias.</p>}
      </div>
      {selectedClient && <small className="admin-muted">Seleccionado: {selectedClient.fullName} ({selectedClient.cedula})</small>}
    </div>
  );
}
