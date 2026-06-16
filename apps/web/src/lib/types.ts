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

export type ExternalUserStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED';
export type CartStatus = 'ACTIVE' | 'CHECKED_OUT' | 'ABANDONED';
export type ServiceOrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CANCELLED';
export type PaymentMethod = 'NEQUI' | 'DAVIPLATA' | 'PSE' | 'TRANSFERENCIA' | 'TARJETA' | 'EFECTIVO';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';
export type ExpedienteStatus = 'ABIERTO' | 'EN_PROCESO' | 'CERRADO';
export type ReceiptStatus = 'POR_PAGAR' | 'PAGADO' | 'VENCIDO' | 'ANULADO';

export interface ExternalUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  status: ExternalUserStatus;
  mustChangePassword: boolean;
  drivePrefix: string;
  clientId?: string | null;
  createdByAdminId?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalAuthUser {
  id: string;
  fullName: string;
  email: string;
  mustChangePassword: boolean;
}

export interface PortalServiceCatalogItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  estimatedPrice: number;
  currency: string;
}

export interface PortalCartItem {
  id: string;
  serviceId?: string | null;
  title: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PortalCart {
  id: string;
  status: CartStatus;
  subtotal: number;
  total: number;
  currency: string;
  items: PortalCartItem[];
}

export interface PortalReceipt {
  id: string;
  number: string;
  status: ReceiptStatus;
  amount: number;
  currency: string;
  dueDate?: string | null;
  paidAt?: string | null;
  notes?: string | null;
}

export interface PortalExpediente {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  status: ExpedienteStatus;
  minioPrefix: string;
  createdAt: string;
  updatedAt: string;
  receipts: PortalReceipt[];
  order?: {
    orderNumber: string;
    status: ServiceOrderStatus;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
  } | null;
}

export interface PortalOrderItem {
  id: string;
  serviceId?: string | null;
  serviceTitle: string;
  serviceDescription?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PortalOrder {
  id: string;
  orderNumber: string;
  status: ServiceOrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string | null;
  paymentNotes?: string | null;
  subtotal: number;
  total: number;
  currency: string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: PortalOrderItem[];
  receipts?: PortalReceipt[];
  expediente?: {
    id: string;
    code: string;
    status: ExpedienteStatus;
    minioPrefix: string;
  } | null;
}

export interface ExpedienteFile {
  key: string;
  name: string;
  size: number;
  updatedAt?: string | null;
  downloadUrl: string;
  publicUrl: string;
}
