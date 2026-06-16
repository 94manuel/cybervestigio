import type { Metadata } from 'next';
import {
  getAdminExternalUserExpedientes,
  getAdminExternalUsers,
  getAdminReceipts,
} from '@/lib/api';
import { requireAdminToken } from '@/lib/session';
import {
  createExpedienteAction,
  createExternalUserAction,
  updateExternalUserAction,
  updateReceiptStatusAction,
} from './actions';

export const metadata: Metadata = { title: 'Portal de clientes' };

function money(value: number, currency = 'COP'): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminPortalClientesPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = await requireAdminToken();
  const users = await getAdminExternalUsers(token, params.q);

  const firstUserId = users[0]?.id;
  const [firstUserExpedientes, receipts] = await Promise.all([
    firstUserId ? getAdminExternalUserExpedientes(token, firstUserId) : Promise.resolve([]),
    getAdminReceipts(token),
  ]);

  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Portal de clientes</h1>
          <p>Administre usuarios externos, expedientes y recibos con estado de pago.</p>
        </div>
      </header>

      <section className="admin-card">
        <h2>Crear usuario externo</h2>
        <form className="admin-form-grid" action={createExternalUserAction}>
          <div className="field"><label htmlFor="fullName">Nombre completo</label><input id="fullName" name="fullName" required minLength={3} /></div>
          <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required /></div>
          <div className="field"><label htmlFor="phone">Teléfono</label><input id="phone" name="phone" /></div>
          <div className="field"><label htmlFor="password">Contraseña temporal (opcional)</label><input id="password" name="password" type="password" minLength={8} /></div>
          <div className="field"><label htmlFor="clientCedula">Cédula cliente (opcional)</label><input id="clientCedula" name="clientCedula" /></div>
          <div className="field"><label htmlFor="company">Empresa (opcional)</label><input id="company" name="company" /></div>
          <div className="field field--full checkbox"><input id="notifyByEmail" name="notifyByEmail" type="checkbox" defaultChecked /><label htmlFor="notifyByEmail">Enviar correo con usuario y contraseña</label></div>
          <div className="field--full"><button className="button button--primary" type="submit">Crear usuario externo</button></div>
        </form>
      </section>

      <section className="admin-card">
        <h2>Usuarios externos</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Estado</th>
                <th>Actualizar</th>
                <th>Crear expediente</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={4}>No hay usuarios externos registrados.</td></tr>
              )}
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.fullName}</strong>
                    {user.email}
                  </td>
                  <td><span className="tag">{user.status}</span></td>
                  <td>
                    <form className="admin-form-grid" action={updateExternalUserAction}>
                      <input type="hidden" name="id" value={user.id} />
                      <div className="field"><label>Nombre</label><input name="fullName" defaultValue={user.fullName} required minLength={3} /></div>
                      <div className="field"><label>Correo</label><input name="email" type="email" defaultValue={user.email} required /></div>
                      <div className="field"><label>Teléfono</label><input name="phone" defaultValue={user.phone || ''} /></div>
                      <div className="field"><label>Estado</label><select name="status" defaultValue={user.status}><option value="ACTIVE">ACTIVO</option><option value="PENDING">PENDIENTE</option><option value="BLOCKED">BLOQUEADO</option></select></div>
                      <div className="field"><label>Nueva contraseña</label><input name="password" type="password" minLength={8} /></div>
                      <div className="field checkbox"><input id={`notify-${user.id}`} name="notifyByEmail" type="checkbox" /><label htmlFor={`notify-${user.id}`}>Notificar credenciales</label></div>
                      <div className="field--full"><button className="button button--outline button--small" type="submit">Guardar</button></div>
                    </form>
                  </td>
                  <td>
                    <form className="admin-form-grid" action={createExpedienteAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <div className="field"><label>Título expediente</label><input name="title" required minLength={4} /></div>
                      <div className="field"><label>Descripción</label><input name="description" /></div>
                      <div className="field checkbox"><input id={`receipt-${user.id}`} name="createReceipt" type="checkbox" defaultChecked /><label htmlFor={`receipt-${user.id}`}>Crear recibo</label></div>
                      <div className="field"><label>Valor recibo</label><input name="receiptAmount" type="number" min={0} step="0.01" /></div>
                      <div className="field"><label>Estado recibo</label><select name="receiptStatus" defaultValue="POR_PAGAR"><option value="POR_PAGAR">POR_PAGAR</option><option value="PAGADO">PAGADO</option><option value="VENCIDO">VENCIDO</option><option value="ANULADO">ANULADO</option></select></div>
                      <div className="field"><label>Vence (opcional)</label><input name="receiptDueDate" type="datetime-local" /></div>
                      <div className="field field--full"><label>Notas recibo</label><input name="receiptNotes" /></div>
                      <div className="field--full"><button className="button button--outline button--small" type="submit">Crear expediente</button></div>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Recibos administrativos</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Recibo</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Estado</th>
                <th>Actualizar estado</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 && (
                <tr><td colSpan={5}>No hay recibos registrados.</td></tr>
              )}
              {receipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td>
                    <strong>{receipt.number}</strong>
                    {receipt.notes || 'Sin notas'}
                  </td>
                  <td>
                    <strong>{receipt.user.fullName}</strong>
                    {receipt.user.email}
                  </td>
                  <td>{money(receipt.amount, receipt.currency)}</td>
                  <td><span className="tag">{receipt.status}</span></td>
                  <td>
                    <form className="admin-form-grid" action={updateReceiptStatusAction}>
                      <input type="hidden" name="id" value={receipt.id} />
                      <div className="field"><label>Estado</label><select name="status" defaultValue={receipt.status}><option value="POR_PAGAR">POR_PAGAR</option><option value="PAGADO">PAGADO</option><option value="VENCIDO">VENCIDO</option><option value="ANULADO">ANULADO</option></select></div>
                      <div className="field"><label>Fecha de pago</label><input name="paidAt" type="datetime-local" /></div>
                      <div className="field"><label>Fecha de vencimiento</label><input name="dueDate" type="datetime-local" /></div>
                      <div className="field field--full"><label>Notas</label><input name="notes" defaultValue={receipt.notes || ''} /></div>
                      <div className="field--full"><button className="button button--outline button--small" type="submit">Actualizar</button></div>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {firstUserExpedientes.length > 0 && (
        <section className="admin-card">
          <h2>Expedientes del primer usuario listado</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Estado</th>
                  <th>Recibos</th>
                </tr>
              </thead>
              <tbody>
                {firstUserExpedientes.map((expediente) => (
                  <tr key={expediente.id}>
                    <td><strong>{expediente.code}</strong></td>
                    <td>{expediente.title}</td>
                    <td><span className="tag">{expediente.status}</span></td>
                    <td>{expediente.receipts.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
