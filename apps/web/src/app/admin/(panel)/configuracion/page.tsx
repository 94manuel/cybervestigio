import type { Metadata } from 'next';
import { getAdminSettings } from '@/lib/api';
import { requireAdminToken } from '@/lib/session';
import { updateSettingsAction } from './actions';

export const metadata: Metadata = { title: 'Configuración del portal' };

export default async function SettingsAdminPage() {
  const token = await requireAdminToken();
  const settings = await getAdminSettings(token);
  return (
    <>
      <header className="admin-heading"><div><h1>Configuración del portal</h1><p>Edite los datos principales presentados en la página de inicio y contacto.</p></div></header>
      <section className="admin-card">
        <h2>Contenido institucional</h2>
        <form className="admin-form-grid" action={updateSettingsAction}>
          <div className="field"><label htmlFor="companyName">Nombre de la empresa</label><input id="companyName" name="companyName" defaultValue={settings.companyName} required /></div>
          <div className="field"><label htmlFor="contactEmail">Correo de contacto</label><input id="contactEmail" type="email" name="contactEmail" defaultValue={settings.contactEmail} required /></div>
          <div className="field field--full"><label htmlFor="heroTitle">Título principal</label><input id="heroTitle" name="heroTitle" defaultValue={settings.heroTitle} required /></div>
          <div className="field field--full"><label htmlFor="heroDescription">Descripción principal</label><textarea id="heroDescription" name="heroDescription" defaultValue={settings.heroDescription} required /></div>
          <div className="field"><label htmlFor="contactPhone">Teléfono</label><input id="contactPhone" name="contactPhone" defaultValue={settings.contactPhone ?? ''} /></div>
          <div className="field"><label htmlFor="location">Ubicación</label><input id="location" name="location" defaultValue={settings.location} required /></div>
          <div className="field--full"><button className="button button--primary" type="submit">Guardar configuración</button></div>
        </form>
      </section>
    </>
  );
}
