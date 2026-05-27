export interface SiteSettings {
  id?: string;
  companyName: string;
  heroTitle: string;
  heroDescription: string;
  contactEmail: string;
  contactPhone?: string | null;
  location: string;
}

export interface Service {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
  active: boolean;
}

export interface Principle {
  title: string;
  description: string;
}

export interface HomeData {
  settings: SiteSettings;
  services: Service[];
  principles: Principle[];
}

export type ContactStatus = 'NEW' | 'IN_REVIEW' | 'ATTENDED' | 'ARCHIVED';

export interface ContactRequest {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  service: string;
  message: string;
  consent: boolean;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  metrics: {
    total: number;
    newContacts: number;
    reviewing: number;
    attended: number;
  };
  latest: ContactRequest[];
}

export type AdminRole = 'ADMIN' | 'USER' | 'SUPERVISOR' | 'AUDITOR';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceLineItem {
  title: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  serviceId?: string;
}

export interface Client {
  id: string;
  fullName: string;
  cedula: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingService {
  id: string;
  sector: string;
  service: string;
  scope: string;
  recommendedPrice: number | string;
  priceNote?: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerClientId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  company?: string | null;
  description: string;
  lineItems: InvoiceLineItem[];
  subtotal: number | string;
  agreementDiscountApplied: boolean;
  agreementEntity?: string | null;
  agreementDiscountAmount: number | string;
  amount: number | string;
  currency: string;
  paymentUrl: string;
  dueDate: string;
  status: InvoiceStatus;
  notes?: string | null;
  sentAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicInvoice {
  invoiceNumber: string;
  customerName: string;
  description: string;
  lineItems: InvoiceLineItem[];
  amount: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentUrl: string;
}
