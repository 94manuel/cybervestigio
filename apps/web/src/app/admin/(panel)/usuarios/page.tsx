import type { Metadata } from 'next';
import { getAdminUsers } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';
import type { AdminRole } from '@/lib/types';
import { createUserAction, updateUserAction } from './actions';

export const metadata: Metadata = { title: 'Administrar usuarios' };

const roleLabel: Record<AdminRole, string> = {
  ADMIN: 'Administrador',
  USER: 'Usuario',
  SUPERVISOR: 'Supervisor',
  AUDITOR: 'Auditor',
};

function dateFormat(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default async function UsersAdminPage() {
  const token = await requireAdminToken();
  const users = await getAdminUsers(token);

  return (
    <>
      <header className="admin-heading">
        <div>
          <h1>Usuarios del panel</h1>
          <p>Cree y edite cuentas con permisos por rol para la administración del portal.</p>
        </div>
      </header>

      <section className="admin-card">
        <h2>Crear nuevo usuario</h2>
        <form className="admin-form-grid" action={createUserAction}>
          <div className="field">
            <label htmlFor="new-name">Nombre</label>
            <input id="new-name" name="name" minLength={3} required />
          </div>
          <div className="field">
            <label htmlFor="new-email">Correo</label>
            <input id="new-email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="new-role">Rol</label>
            <select id="new-role" name="role" defaultValue="USER">
              <option value="ADMIN">Administrador</option>
              <option value="USER">Usuario</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="AUDITOR">Auditor</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="new-password">Contraseña temporal (opcional)</label>
            <input id="new-password" name="password" type="password" minLength={8} placeholder="Temporal-2026!" />
          </div>
          <div className="field--full">
            <button className="button button--primary" type="submit">Crear cuenta</button>
          </div>
        </form>
      </section>

      <section className="admin-card">
        <h2>Cuentas existentes</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Creado</th>
                <th>Actualizar</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={4}>No existen cuentas registradas.</td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    {user.email}
                  </td>
                  <td>
                    <span className="tag">{roleLabel[user.role]}</span>
                  </td>
                  <td>{dateFormat(user.createdAt)}</td>
                  <td>
                    <form className="admin-form-grid" action={updateUserAction}>
                      <input type="hidden" name="id" value={user.id} />
                      <div className="field">
                        <label>Nombre</label>
                        <input name="name" defaultValue={user.name} minLength={3} required />
                      </div>
                      <div className="field">
                        <label>Correo</label>
                        <input name="email" type="email" defaultValue={user.email} required />
                      </div>
                      <div className="field">
                        <label>Rol</label>
                        <select name="role" defaultValue={user.role}>
                          <option value="ADMIN">Administrador</option>
                          <option value="USER">Usuario</option>
                          <option value="SUPERVISOR">Supervisor</option>
                          <option value="AUDITOR">Auditor</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Nueva contraseña (opcional)</label>
                        <input name="password" type="password" minLength={8} placeholder="Solo si va a cambiar" />
                      </div>
                      <div className="field--full">
                        <button className="button button--outline button--small" type="submit">Guardar</button>
                      </div>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
