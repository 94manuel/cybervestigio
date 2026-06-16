import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { portalRegisterAction } from './actions';

export const metadata: Metadata = { title: 'Registro de cliente' };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function ClientRegisterPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="content-section">
        <div className="container">
          <section className="admin-card" style={{ maxWidth: 760, margin: '0 auto' }}>
            <h1>Crear cuenta de cliente</h1>
            <p className="admin-muted">
              Registre su cuenta para solicitar servicios, pagar desde carrito y acceder a sus expedientes en el drive seguro.
            </p>
            {params.error && <p className="form-message form-message--error">No fue posible crear la cuenta. Verifique los datos.</p>}
            <form className="admin-form-grid" action={portalRegisterAction}>
              <div className="field"><label htmlFor="fullName">Nombre completo</label><input id="fullName" name="fullName" minLength={3} required /></div>
              <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" required /></div>
              <div className="field"><label htmlFor="phone">Teléfono (opcional)</label><input id="phone" name="phone" /></div>
              <div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" minLength={8} required /></div>
              <div className="field--full">
                <button className="button button--primary" type="submit">Crear cuenta</button>
              </div>
            </form>
            <p className="admin-muted" style={{ marginTop: 16 }}>
              ¿Ya tiene cuenta? <Link href="/cuenta/login" className="link-arrow">Iniciar sesión</Link>
            </p>
          </section>
        </div>
      </main>
      <SiteFooter showChat={false} />
    </>
  );
}
