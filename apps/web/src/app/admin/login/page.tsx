import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import { loginAction } from './actions';

export const metadata: Metadata = { title: 'Acceso administrativo' };

type Props = { searchParams: Promise<{ error?: string; expired?: string }> };

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <main className="login-page">
      <section className="login-brand">
        <Logo />
        <h1>Control documental y gestión del portal</h1>
        <p>Panel reservado para gestionar solicitudes de contacto, servicios publicados y contenido institucional de CyberVestigio.</p>
      </section>
      <section className="login-panel">
        <h2>Ingresar</h2>
        <p>Acceso exclusivo para personal autorizado.</p>
        {params.error && <p className="form-message form-message--error">Credenciales incorrectas o API no disponible.</p>}
        {params.expired && <p className="form-message form-message--error">La sesión expiró. Inicie sesión nuevamente.</p>}
        <form className="login-form" action={loginAction}>
          <div className="field"><label htmlFor="email">Correo administrativo</label><input id="email" name="email" type="email" required /></div>
          <div className="field"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required /></div>
          <button className="button button--primary" type="submit">Iniciar sesión</button>
        </form>
      </section>
    </main>
  );
}
