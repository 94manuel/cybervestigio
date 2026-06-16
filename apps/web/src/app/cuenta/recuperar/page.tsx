import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { requestPortalRecoveryAction } from './actions';

export const metadata: Metadata = { title: 'Recuperar cuenta' };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ClientRecoverPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="content-section">
        <div className="container">
          <section className="admin-card" style={{ maxWidth: 700, margin: '0 auto' }}>
            <h1>Recuperar acceso</h1>
            <p className="admin-muted">
              Ingrese el correo de su cuenta. Le enviaremos un código para restablecer su contraseña.
            </p>
            {params.error && <p className="form-message form-message--error">No fue posible procesar la solicitud.</p>}
            <form className="login-form" action={requestPortalRecoveryAction}>
              <div className="field"><label htmlFor="email">Correo de la cuenta</label><input id="email" name="email" type="email" required /></div>
              <button className="button button--primary" type="submit">Enviar código</button>
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
