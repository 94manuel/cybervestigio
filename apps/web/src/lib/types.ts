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
