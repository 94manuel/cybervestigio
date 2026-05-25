import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getHomeData } from '@/lib/api';
import { submitContact } from './actions';

export const metadata: Metadata = { title: 'Contacto' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ enviado?: string; error?: string }> };

export default async function ContactoPage({ searchParams }: Props) {
  const params = await searchParams;
  const { settings, services } = await getHomeData();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero">
          <div className="container">
            <p className="eyebrow">Contacto</p>
            <h1>Describa su requerimiento de evidencia digital</h1>
            <p>Envíe una descripción inicial sin adjuntar archivos sensibles. Se podrá definir posteriormente el canal seguro y el alcance técnico adecuado.</p>
          </div>
        </section>
        <section className="content-section">
          <div className="container contact-grid">
            <aside className="contact-aside">
              <h2>Contacto inicial</h2>
              <p>Utilice este canal para solicitar orientación sobre preservación, análisis técnico o documentación de evidencia digital.</p>
              <div className="contact-detail"><strong>Correo</strong>{settings.contactEmail}</div>
              {settings.contactPhone && <div className="contact-detail"><strong>Teléfono</strong>{settings.contactPhone}</div>}
              <div className="contact-detail"><strong>Ubicación</strong>{settings.location}</div>
            </aside>
            <form className="contact-form" action={submitContact}>
              {params.enviado === '1' && <p className="form-message">Su solicitud fue registrada correctamente. Conservaremos los datos suministrados para gestionar el contacto.</p>}
              {params.error && <p className="form-message form-message--error">No fue posible registrar la solicitud. Verifique los datos diligenciados o intente nuevamente.</p>}
              <div className="form-grid">
                <div className="field"><label htmlFor="fullName">Nombre completo *</label><input id="fullName" name="fullName" minLength={3} required /></div>
                <div className="field"><label htmlFor="email">Correo electrónico *</label><input id="email" name="email" type="email" required /></div>
                <div className="field"><label htmlFor="phone">Teléfono</label><input id="phone" name="phone" /></div>
                <div className="field"><label htmlFor="company">Empresa u organización</label><input id="company" name="company" /></div>
                <div className="field field--full">
                  <label htmlFor="service">Servicio de interés *</label>
                  <select id="service" name="service" required defaultValue="">
                    <option value="" disabled>Seleccione una opción</option>
                    {services.map((service) => <option key={service.id} value={service.title}>{service.title}</option>)}
                  </select>
                </div>
                <div className="field field--full"><label htmlFor="message">Descripción general del requerimiento *</label><textarea id="message" name="message" minLength={20} required placeholder="Explique el tipo de evidencia o situación que requiere revisar. Evite incorporar información sensible en este primer mensaje." /></div>
                <div className="honeypot" aria-hidden="true"><label htmlFor="website">Sitio web</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
                <label className="checkbox field--full">
                  <input type="checkbox" name="consent" required />
                  <span>Autorizo el tratamiento de mis datos para gestionar esta solicitud y declaro haber leído la <Link href="/politica-de-privacidad"><u>política de tratamiento de datos</u></Link>.</span>
                </label>
                <div className="field--full"><button className="button button--primary" type="submit">Enviar solicitud →</button></div>
              </div>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
