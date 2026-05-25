import type { Metadata } from 'next';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = { title: 'Política de tratamiento de datos' };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero">
          <div className="container">
            <p className="eyebrow">Privacidad</p>
            <h1>Política inicial de tratamiento de datos personales</h1>
            <p>Texto base para el formulario web de CyberVestigio. Requiere validación jurídica y actualización de datos corporativos antes de uso comercial.</p>
          </div>
        </section>
        <section className="content-section">
          <div className="container legal-copy">
            <p className="notice"><strong>Nota de implementación:</strong> esta sección se entrega como plantilla inicial del portal y debe ser revisada por asesoría jurídica antes de captar información real.</p>
            <h2>1. Responsable</h2>
            <p>CyberVestigio será responsable del tratamiento de los datos personales recibidos a través de sus canales de contacto, una vez se formalicen sus datos de identificación, domicilio y medios oficiales.</p>
            <h2>2. Finalidades</h2>
            <p>Los datos diligenciados en el formulario podrán utilizarse para responder solicitudes, evaluar preliminarmente un requerimiento técnico, establecer comunicaciones relacionadas con el servicio y cumplir obligaciones legales aplicables.</p>
            <h2>3. Información solicitada</h2>
            <p>El formulario solicita nombre, correo electrónico, teléfono opcional, organización opcional, servicio requerido y descripción general del caso. No se deben adjuntar evidencias sensibles mediante este formulario inicial.</p>
            <h2>4. Derechos del titular</h2>
            <p>El titular podrá solicitar consulta, actualización, rectificación o supresión de información, así como revocar la autorización cuando proceda, mediante el correo institucional que sea publicado oficialmente.</p>
            <h2>5. Seguridad</h2>
            <p>CyberVestigio deberá adoptar medidas técnicas y administrativas razonables para proteger la información recibida y restringir su acceso a personal autorizado.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
