import type { Metadata } from 'next';
import { getPortalExpedienteFiles, getPortalExpedientes } from '@/lib/api';
import { requireClientToken } from '@/lib/session';

export const metadata: Metadata = { title: 'Drive de expedientes' };

function byteSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024 ** 3).toFixed(1)} GB`;
}

export default async function ClientDrivePage() {
  const token = await requireClientToken();
  const expedientes = await getPortalExpedientes(token);

  const filesByExpediente = await Promise.all(
    expedientes.map(async (expediente) => ({
      expedienteId: expediente.id,
      files: (await getPortalExpedienteFiles(token, expediente.id)).files,
    })),
  );

  const fileMap = new Map(filesByExpediente.map((entry) => [entry.expedienteId, entry.files]));

  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Drive de expedientes</h1>
          <p>Visualice las carpetas de expediente y descargue archivos almacenados en MinIO.</p>
        </div>
      </header>

      <section className="admin-card">
        {expedientes.length === 0 && <p className="admin-muted">Aún no tiene expedientes disponibles.</p>}
        {expedientes.map((expediente) => {
          const files = fileMap.get(expediente.id) ?? [];
          return (
            <article className="admin-record-card" key={expediente.id}>
              <div className="admin-record-card__header">
                <div>
                  <h3>{expediente.code} · {expediente.title}</h3>
                  <p>{expediente.description || 'Sin descripción adicional.'}</p>
                </div>
                <div className="admin-record-card__meta">
                  <span className="tag">{expediente.status}</span>
                  <small>{new Date(expediente.createdAt).toLocaleString('es-CO')}</small>
                </div>
              </div>

              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Archivo</th>
                      <th>Tamaño</th>
                      <th>Actualizado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.length === 0 && (
                      <tr>
                        <td colSpan={4}>No hay archivos cargados en esta carpeta.</td>
                      </tr>
                    )}
                    {files.map((file) => (
                      <tr key={file.key}>
                        <td>{file.name}</td>
                        <td>{byteSize(file.size)}</td>
                        <td>{file.updatedAt ? new Date(file.updatedAt).toLocaleString('es-CO') : 'Sin fecha'}</td>
                        <td>
                          <a className="button button--outline button--small" href={file.downloadUrl} target="_blank" rel="noreferrer">Descargar</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
