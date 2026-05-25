import Link from 'next/link';
import { ServiceCard } from '@/components/ServiceCard';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getHomeData } from '@/lib/api';

export const dynamic = 'force-dynamic';

const process = [
  { number: '01', title: 'Recepción y alcance', text: 'Definimos el objetivo, la autorización, la fuente de información y las condiciones de custodia.' },
  { number: '02', title: 'Preservación', text: 'Documentamos el elemento recibido y aplicamos controles orientados a mantener su integridad.' },
  { number: '03', title: 'Análisis técnico', text: 'Examinamos artefactos digitales relevantes de acuerdo con el alcance autorizado.' },
  { number: '04', title: 'Informe verificable', text: 'Presentamos metodología, hallazgos y conclusiones técnicas comprensibles.' },
];

export default async function HomePage() {
  const { settings, services, principles } = await getHomeData();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <p className="eyebrow">Evidencia digital verificable</p>
              <h1>{settings.heroTitle.includes('evidencia técnica') ? <>{settings.heroTitle.replace('evidencia técnica.', '')}<span>evidencia técnica.</span></> : settings.heroTitle}</h1>
              <p className="hero-description">{settings.heroDescription}</p>
              <div className="hero-actions">
                <Link className="button button--primary" href="/contacto">Solicitar evaluación inicial →</Link>
                <Link className="button button--outline" href="/metodologia">Ver metodología</Link>
              </div>
              <div className="hero-badges">
                <span>Cadena de custodia</span>
                <span>Integridad técnica</span>
                <span>Manejo confidencial</span>
              </div>
            </div>
            <div className="evidence-card" aria-label="Ejemplo visual de trazabilidad">
              <div className="evidence-head">
                <span>Trazabilidad de evidencia</span>
                <span className="evidence-status">Integridad verificada</span>
              </div>
              <div className="evidence-file">
                <div className="evidence-icon">HD</div>
                <div>
                  <strong>Elemento digital identificado</strong>
                  <small>Registro técnico y adquisición documentada</small>
                </div>
              </div>
              <div className="hash-box">
                <label>Hash SHA-256</label>
                a6f3c87d...89be2d4f...c91277a1
              </div>
              <div className="card-metrics">
                <div><strong>04</strong><small>Etapas</small></div>
                <div><strong>100%</strong><small>Control</small></div>
                <div><strong>01</strong><small>Informe</small></div>
              </div>
            </div>
          </div>
        </section>

        <section className="services">
          <div className="container">
            <header className="section-head">
              <p className="eyebrow">Servicios</p>
              <h2 className="section-title">Soluciones forenses orientadas a cada evidencia</h2>
              <p className="section-intro">Servicios concebidos para preservar rastros digitales y documentar cada decisión técnica con claridad.</p>
            </header>
            <div className="services-grid">
              {services.map((service) => <ServiceCard key={service.id} service={service} />)}
            </div>
          </div>
        </section>

        <section className="method">
          <div className="container method-grid">
            <div>
              <p className="eyebrow">Metodología</p>
              <h2 className="section-title">Del hallazgo al informe, con control del procedimiento</h2>
              <p className="section-intro">La investigación digital exige orden, neutralidad técnica y protección de la información durante cada actuación.</p>
              <div className="method-note">Enfoque orientado a preservación de evidencia digital, documentación de custodia y verificación de integridad.</div>
            </div>
            <div className="steps-grid">
              {process.map((step) => (
                <article className="step-card" key={step.number}>
                  <span className="step-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="principles">
          <div className="container">
            <p className="eyebrow">Confianza</p>
            <h2 className="section-title">Principios para respaldar una investigación digital</h2>
            <div className="principles-grid">
              {principles.map((principle, index) => (
                <article className="principle" key={principle.title}>
                  <span className="principle-index">0{index + 1}</span>
                  <h3>{principle.title}</h3>
                  <p>{principle.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="container cta-box">
            <div>
              <p className="eyebrow">Contacto inicial</p>
              <h2>Proteja la evidencia antes de que se pierda o sea alterada.</h2>
              <p>Describa el caso y reciba orientación inicial sobre conservación, alcance y documentación requerida.</p>
            </div>
            <Link className="button button--primary" href="/contacto">Contactar a CyberVestigio →</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
