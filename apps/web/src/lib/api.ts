import { redirect } from 'next/navigation';
import { AdminAccount, BillingService, Client, ContactRequest, DashboardData, HomeData, Invoice, PublicInvoice, Service, SiteSettings } from './types';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000/api/v1';

export const defaultHomeData: HomeData = {
  settings: {
    companyName: 'CyberVestigio',
    heroTitle: 'El vestigio digital que convierte los hechos en evidencia técnica.',
    heroDescription:
      'Investigación ciberforense con preservación, análisis e informes claros para organizaciones, abogados y personas que necesitan sustentar un caso digital.',
    contactEmail: 'contacto@cybervestigio.co',
    contactPhone: '+57 300 000 0000',
    location: 'Colombia',
  },
  services: [
    {
      id: 'default-1', slug: 'informatica-forense', title: 'Informática forense', icon: 'hard-drive', sortOrder: 1, active: true,
      description: 'Adquisición, preservación y análisis técnico de evidencia digital en equipos y medios de almacenamiento autorizados.',
    },
    {
      id: 'default-2', slug: 'investigacion-incidentes', title: 'Investigación de incidentes', icon: 'search', sortOrder: 2, active: true,
      description: 'Reconstrucción técnica de accesos, alteraciones, borrados y posibles vectores de compromiso digital.',
    },
    {
      id: 'default-3', slug: 'cadena-custodia', title: 'Cadena de custodia', icon: 'file-check', sortOrder: 3, active: true,
      description: 'Identificación, trazabilidad y documentación controlada de evidencia digital.',
    },
    {
      id: 'default-4', slug: 'evidencia-movil-nube', title: 'Evidencia móvil y nube', icon: 'smartphone', sortOrder: 4, active: true,
      description: 'Orientación para preservar información relevante de dispositivos, cuentas y respaldos autorizados.',
    },
  ],
  principles: [
    { title: 'Trazabilidad', description: 'Registro organizado de recepción, transferencia, examen y entrega de evidencias.' },
    { title: 'Integridad', description: 'Controles técnicos y valores hash para verificar la evidencia adquirida.' },
    { title: 'Confidencialidad', description: 'Manejo reservado y acceso restringido a la información entregada.' },
  ],
};

async function publicRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`API pública respondió con estado ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getHomeData(): Promise<HomeData> {
  try {
    return await publicRequest<HomeData>('/site/home');
  } catch {
    return defaultHomeData;
  }
}

export async function getServices(): Promise<Service[]> {
  try {
    return await publicRequest<Service[]>('/site/services');
  } catch {
    return defaultHomeData.services;
  }
}

export const getPublicInvoice = (invoiceNumber: string): Promise<PublicInvoice> =>
  publicRequest(`/site/invoices/${encodeURIComponent(invoiceNumber)}`);

export async function adminRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 401) redirect('/admin/login?expired=1');
  if (!response.ok) throw new Error(`Operación administrativa fallida: ${response.status}`);
  return response.json() as Promise<T>;
}

export const getDashboard = (token: string): Promise<DashboardData> => adminRequest('/admin/dashboard', token);
export const getAdminContacts = (token: string): Promise<ContactRequest[]> => adminRequest('/admin/contacts', token);
export const getAdminServices = (token: string): Promise<Service[]> => adminRequest('/admin/services', token);
export const getAdminSettings = (token: string): Promise<SiteSettings> => adminRequest('/admin/settings', token);
export const getAdminUsers = (token: string): Promise<AdminAccount[]> => adminRequest('/admin/users', token);
export const getAdminClients = (token: string, search?: string): Promise<Client[]> =>
  adminRequest(`/admin/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`, token);
export const getAdminBillingServices = (token: string): Promise<BillingService[]> => adminRequest('/admin/billing-services', token);
export const getAdminInvoices = (token: string): Promise<Invoice[]> => adminRequest('/admin/invoices', token);
export async function getAdminInvoice(token: string, id: string): Promise<Invoice | null> {
  const response = await fetch(`${apiUrl}/admin/invoices/${encodeURIComponent(id)}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) redirect('/admin/login?expired=1');
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Operación administrativa fallida: ${response.status}`);
  return response.json() as Promise<Invoice>;
}
export const getApiUrl = (): string => apiUrl;
