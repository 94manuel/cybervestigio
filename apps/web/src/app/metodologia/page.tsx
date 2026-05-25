import type { Metadata } from 'next';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = { title: 'Metodología' };

const steps = [
  { number: '01', title: 'Solicitud y autorización', text: 'Se identifica el requerimiento, el alcance técnico, el responsable que autoriza la actuación y la información que puede ser examinada.' },
  { number: '02', title: 'Identificación y registro', text: 'Se documentan dispositivos, soportes, estado recibido, fechas y datos necesarios para mantener trazabilidad del elemento digital.' },
  { number: '03', title: 'Preservación y adquisición', text: 'Se aplican procedimientos orientados a evitar modificaciones innecesarias y se registran controles de integridad cuando corresponda.' },
  { number: '04', title: 'Análisis', text: 'Se revisan artefactos relevantes para responder el objetivo definido, conservando bitácoras y referencias verificables.' },
  { number: '05', title: 'Informe técnico', text: 'Se entregan metodología aplicada, fuentes examinadas, hallazgos, limitaciones y conclusiones en lenguaje comprensible.' },
  { number: '06', title: 'Entrega y custodia', text: 'Se documenta la entrega del informe y el tratamiento previsto para los elementos o copias examinadas.' },
];

export default function MetodologiaPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="page-hero">
          <div className="container">
            <p className="eyebrow">Metodología</p>
            <h1>Una ruta documentada para cada actuación forense</h1>
            <p>La metodología se adapta al alcance autorizado del caso y prioriza la trazabilidad, integridad y claridad del informe técnico.</p>
          </div>
        </section>
        <section className="content-section">
          <div className="container process-line">
            {steps.map((step) => (
              <article className="process-row" key={step.number}>
                <strong>{step.number}</strong>
                <div><h2>{step.title}</h2><p>{step.text}</p></div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
