import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { resetPortalPasswordAction } from './actions';

export const metadata: Metadata = { title: 'Restablecer contraseña' };

type Props = { searchParams: Promise<{ error?: string; requested?: string; email?: string }> };

export default async function ClientResetPage({ searchParams }: Props) {
  const params = await searchParams;
  const initialEmail = params.email ?? '';

  return (
    <>
      <SiteHeader />
      <main className="content-section">
        <div className="container">
          <section className="admin-card" style={{ maxWidth: 760, margin: '0 auto' }}>
            <h1>Restablecer contraseña</h1>
            <p className="admin-muted">
              Escriba el correo, el código enviado y la nueva contraseña para recuperar su cuenta.
            </p>
            {params.requested && <p className="form-message">Código enviado correctamente. Revise su correo.</p>}
            {params.error && <p className="form-message form-message--error">Código inválido o expirado. Solicite uno nuevo.</p>}
            <form className="admin-form-grid" action={resetPortalPasswordAction}>
              <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" defaultValue={initialEmail} required /></div>
              <div className="field"><label htmlFor="code">Código</label><input id="code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></div>
              <div className="field field--full"><label htmlFor="newPassword">Nueva contraseña</label><input id="newPassword" name="newPassword" type="password" minLength={8} required /></div>
              <div className="field--full"><button className="button button--primary" type="submit">Actualizar contraseña</button></div>
            </form>
            <p className="admin-muted" style={{ marginTop: 16 }}>
              <Link href="/cuenta/login" className="link-arrow">Volver a iniciar sesión</Link>
            </p>
          </section>
        </div>
      </main>
      <SiteFooter showChat={false} />
    </>
  );
}
