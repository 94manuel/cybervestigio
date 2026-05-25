import Link from 'next/link';
import type { Service } from '@/lib/types';
import { ServiceIcon } from './ServiceIcon';

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="service-card">
      <div className="service-icon-wrap"><ServiceIcon name={service.icon} /></div>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <Link className="link-arrow" href="/contacto">Solicitar información</Link>
    </article>
  );
}
