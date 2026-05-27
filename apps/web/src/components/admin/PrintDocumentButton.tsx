'use client';

export function PrintDocumentButton() {
  return (
    <button className="button button--outline button--small" type="button" onClick={() => window.print()}>
      Imprimir documento
    </button>
  );
}