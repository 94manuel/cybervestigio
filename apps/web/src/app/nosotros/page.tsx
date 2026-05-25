import type { Metadata } from 'next';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = { title: 'Nosotros' };

export default function NosotrosPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero">
          <div className="container">
            <p className="eyebrow">CyberVestigio</p>
            <h1>Tecnología, precisión documental y evidencia digital</h1>
            <p>Una identidad creada para acompañar investigaciones digitales con criterio técnico y comunicaciones comprensibles.</p>
          </div>
        </section>
        <section className="content-section">
          <div className="container about-grid">
            <div>
              <h2 className="section-title">Propósito corporativo</h2>
              <p>CyberVestigio nace como una propuesta enfocada en informática forense y preservación de evidencia digital, apoyando a personas y organizaciones que requieren comprender hechos ocurridos en entornos tecnológicos.</p>
              <p>El servicio parte de un alcance autorizado, registra las actuaciones realizadas y procura que los resultados puedan ser comprendidos, revisados y sustentados técnicamente.</p>
              <p>La marca integra los conceptos de seguridad, búsqueda y rastro digital: cada elemento puede contener información relevante que debe manejarse con cuidado, reserva y método.</p>
            </div>
            <aside className="values-panel">
              <h2>Principios de marca</h2>
              <div><strong>Objetividad</strong><span>Analizar la información encontrada sin anticipar conclusiones.</span></div>
              <div><strong>Integridad</strong><span>Documentar controles técnicos que respalden la evidencia examinada.</span></div>
              <div><strong>Reserva</strong><span>Tratar la información del caso con acceso limitado y confidencialidad.</span></div>
              <div><strong>Claridad</strong><span>Comunicar hallazgos y limitaciones con precisión.</span></div>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
