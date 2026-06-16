import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { portalLoginAction } from './actions';

export const metadata: Metadata = { title: 'Ingreso de clientes' };

type Props = { searchParams: Promise<{ error?: string; registered?: string; reset?: string; expired?: string }> };

export default async function ClientLoginPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="content-section">
        <div className="container">
          <section className="admin-card" style={{ maxWidth: 680, margin: '0 auto' }}>
            <h1>Portal de clientes</h1>
            <p className="admin-muted">
              Ingrese con su correo y contraseña. El segundo factor se enviará por correo para permitir acceso a su drive de expedientes.
            </p>
            {params.error && <p className="form-message form-message--error">No fue posible iniciar sesión. Verifique sus datos.</p>}
            {params.expired && <p className="form-message form-message--error">Su sesión expiró. Inicie de nuevo.</p>}
            {params.registered && <p className="form-message">Cuenta creada correctamente. Inicie sesión para continuar.</p>}
            {params.reset && <p className="form-message">Contraseña actualizada correctamente.</p>}
            <form className="login-form" action={portalLoginAction}>
              <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required /></div>
              <div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required /></div>
              <button className="button button--primary" type="submit">Enviar código 2FA</button>
            </form>
            <p className="admin-muted" style={{ marginTop: 18 }}>
              ¿Aún no tiene cuenta? <Link href="/cuenta/registro" className="link-arrow">Regístrese</Link>
            </p>
            <p className="admin-muted" style={{ marginTop: 8 }}>
              ¿Olvidó su contraseña? <Link href="/cuenta/recuperar" className="link-arrow">Recuperar acceso</Link>
            </p>
          </section>
        </div>
      </main>
      <SiteFooter showChat={false} />
    </>
  );
}
