import { redirect } from 'next/navigation';
import {
  AdminAccount,
  BillingService,
  Client,
  ContactRequest,
  DashboardData,
  ExpedienteFile,
  ExternalUser,
  HomeData,
  Invoice,
  PaymentMethod,
  PortalAuthUser,
  PortalCart,
  PortalExpediente,
  PortalOrder,
  PortalServiceCatalogItem,
  PublicInvoice,
  Service,
  SiteSettings,
} from './types';

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

export async function portalRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) redirect('/cuenta/login?expired=1');
  if (!response.ok) throw new Error(`Operación de portal fallida: ${response.status}`);
  return response.json() as Promise<T>;
}

export const getDashboard = (token: string): Promise<DashboardData> => adminRequest('/admin/dashboard', token);
export const getAdminContacts = (token: string): Promise<ContactRequest[]> => adminRequest('/admin/contacts', token);
export const getAdminServices = (token: string): Promise<Service[]> => adminRequest('/admin/services', token);
export const getAdminSettings = (token: string): Promise<SiteSettings> => adminRequest('/admin/settings', token);
export const getAdminUsers = (token: string): Promise<AdminAccount[]> => adminRequest('/admin/users', token);
export const getAdminExternalUsers = (token: string, search?: string): Promise<Array<ExternalUser & { client?: Client | null }>> =>
  adminRequest(`/admin/external-users${search ? `?search=${encodeURIComponent(search)}` : ''}`, token);
export const getAdminClients = (token: string, search?: string): Promise<Client[]> =>
  adminRequest(`/admin/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`, token);
export const getAdminBillingServices = (token: string): Promise<BillingService[]> => adminRequest('/admin/billing-services', token);
export const getAdminInvoices = (token: string): Promise<Invoice[]> => adminRequest('/admin/invoices', token);
export const getAdminExternalUserExpedientes = (token: string, userId: string): Promise<PortalExpediente[]> =>
  adminRequest(`/admin/external-users/${encodeURIComponent(userId)}/expedientes`, token);
export const getAdminReceipts = (token: string, userId?: string): Promise<Array<{
  id: string;
  number: string;
  status: string;
  amount: number;
  currency: string;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  user: { id: string; fullName: string; email: string };
}>> => adminRequest(`/admin/receipts${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, token);
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

export async function portalAuthRequest<T>(path: string, payload: object): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Autenticación de portal fallida: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const registerPortalUser = (payload: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<{ user: PortalAuthUser; message: string }> => portalAuthRequest('/portal-auth/register', payload);

export const loginPortalUser = (payload: {
  email: string;
  password: string;
}): Promise<{ twoFactorRequired: boolean; challengeToken: string; expiresInMinutes: number; email: string }> =>
  portalAuthRequest('/portal-auth/login', payload);

export const verifyPortal2fa = (payload: {
  challengeToken: string;
  code: string;
}): Promise<{ accessToken: string; user: PortalAuthUser }> => portalAuthRequest('/portal-auth/verify-2fa', payload);

export const requestPortalPasswordReset = (payload: { email: string }): Promise<{ message: string }> =>
  portalAuthRequest('/portal-auth/request-password-reset', payload);

export const resetPortalPassword = (payload: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<{ message: string }> => portalAuthRequest('/portal-auth/reset-password', payload);

export const getPortalProfile = (token: string): Promise<{ user: ExternalUser; metrics: { orders: number; expedientes: number; pendingReceipts: number } }> =>
  portalRequest('/portal/profile', token);

export const getPortalServices = (token: string): Promise<PortalServiceCatalogItem[]> =>
  portalRequest('/portal/services', token);

export const getPortalCart = (token: string): Promise<PortalCart> => portalRequest('/portal/cart', token);

export const addPortalCartItem = (
  token: string,
  payload: { serviceId: string; quantity?: number },
): Promise<PortalCart> => portalRequest('/portal/cart/items', token, { method: 'POST', body: JSON.stringify(payload) });

export const updatePortalCartItem = (
  token: string,
  itemId: string,
  payload: { quantity: number },
): Promise<PortalCart> =>
  portalRequest(`/portal/cart/items/${encodeURIComponent(itemId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const removePortalCartItem = (token: string, itemId: string): Promise<PortalCart> =>
  portalRequest(`/portal/cart/items/${encodeURIComponent(itemId)}`, token, { method: 'DELETE' });

export const checkoutPortalCart = (
  token: string,
  payload: { paymentMethod: PaymentMethod; paymentNotes?: string },
): Promise<{ order: PortalOrder; paymentInstructions: string; nextStep: string }> =>
  portalRequest('/portal/cart/checkout', token, { method: 'POST', body: JSON.stringify(payload) });

export const getPortalOrders = (token: string): Promise<PortalOrder[]> => portalRequest('/portal/orders', token);

export const payPortalOrder = (
  token: string,
  orderId: string,
  payload: { paymentReference: string; paymentNotes?: string },
): Promise<{ order: PortalOrder; expediente: { id: string; code: string; status: string }; message: string }> =>
  portalRequest(`/portal/orders/${encodeURIComponent(orderId)}/pay`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getPortalExpedientes = (token: string): Promise<PortalExpediente[]> =>
  portalRequest('/portal/expedientes', token);

export const getPortalExpedienteFiles = (
  token: string,
  expedienteId: string,
): Promise<{ expediente: { id: string; code: string; title?: string }; files: ExpedienteFile[] }> =>
  portalRequest(`/portal/expedientes/${encodeURIComponent(expedienteId)}/files`, token);

export const createPortalUploadUrl = (
  token: string,
  expedienteId: string,
  payload: { fileName: string; contentType?: string },
): Promise<{ key: string; uploadUrl: string; publicUrl: string }> =>
  portalRequest(`/portal/expedientes/${encodeURIComponent(expedienteId)}/upload-url`, token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createPortalDownloadUrl = (
  token: string,
  expedienteId: string,
  key: string,
): Promise<{ key: string; downloadUrl: string; publicUrl: string }> =>
  portalRequest(`/portal/expedientes/${encodeURIComponent(expedienteId)}/download-url?key=${encodeURIComponent(key)}`, token);

export const getApiUrl = (): string => apiUrl;
