import type { Metadata } from 'next';
import { ServiceCard } from '@/components/ServiceCard';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getServices } from '@/lib/api';

export const metadata: Metadata = { title: 'Servicios forenses' };
export const dynamic = 'force-dynamic';

export default async function ServiciosPage() {
  const services = await getServices();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero">
          <div className="container">
            <p className="eyebrow">Servicios</p>
            <h1>Análisis técnico para preservar y comprender evidencia digital</h1>
            <p>CyberVestigio estructura servicios orientados a la revisión autorizada de rastros digitales, con documentación clara y control de integridad.</p>
          </div>
        </section>
        <section className="content-section">
          <div className="container full-services-grid">
            {services.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
