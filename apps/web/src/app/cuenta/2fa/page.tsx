import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { verifyPortal2faAction } from './actions';

export const metadata: Metadata = { title: 'Verificación 2FA' };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ClientTwoFactorPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="content-section">
        <div className="container">
          <section className="admin-card" style={{ maxWidth: 680, margin: '0 auto' }}>
            <h1>Segundo factor por correo</h1>
            <p className="admin-muted">
              Revise su correo y escriba el código de 6 dígitos para completar el ingreso al portal.
            </p>
            {params.error && <p className="form-message form-message--error">Código inválido o vencido. Solicite un nuevo acceso.</p>}
            <form className="login-form" action={verifyPortal2faAction}>
              <div className="field"><label htmlFor="code">Código 2FA</label><input id="code" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></div>
              <button className="button button--primary" type="submit">Verificar e ingresar</button>
            </form>
            <p className="admin-muted" style={{ marginTop: 16 }}>
              <Link href="/cuenta/login" className="link-arrow">Volver al inicio de sesión</Link>
            </p>
          </section>
        </div>
      </main>
      <SiteFooter showChat={false} />
    </>
  );
}
