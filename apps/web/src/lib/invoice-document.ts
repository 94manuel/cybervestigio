import type { Invoice, InvoiceStatus, SiteSettings } from './types';

export const INVOICE_DOCUMENT_CODE = 'CV-DF-FAC-001';
export const INVOICE_DOCUMENT_VERSION = '1.0';
export const INVOICE_DOCUMENT_TITLE = 'Acta ejecutiva de facturacion y relacion de cobro';

export const statusLabel: Record<InvoiceStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
};

export type DocumentDataRow = {
  label: string;
  value: string;
};

export type DocumentTimelineRow = {
  title: string;
  value: string;
  detail: string;
};

export type DocumentSignatoryRow = {
  role: string;
  signer: string;
  note: string;
};

export function dateFormat(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function moneyFormat(value: number | string, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function buildInvoiceDocumentData(invoice: Invoice, settings: SiteSettings) {
  const issuerRows: DocumentDataRow[] = [
    { label: 'Entidad emisora', value: settings.companyName },
    { label: 'Correo institucional', value: settings.contactEmail },
    { label: 'Telefono', value: settings.contactPhone?.trim() || 'No registrado' },
    { label: 'Ubicacion', value: settings.location },
  ];

  const clientRows: DocumentDataRow[] = [
    { label: 'Cliente', value: invoice.customerName },
    { label: 'Correo', value: invoice.customerEmail },
    { label: 'Telefono', value: invoice.customerPhone?.trim() || 'No registrado' },
    { label: 'Empresa', value: invoice.company?.trim() || 'No registrada' },
  ];

  const controlRows: DocumentDataRow[] = [
    { label: 'Proceso', value: 'Gestion de evidencia digital y facturacion' },
    { label: 'Estado documental', value: 'Vigente' },
    { label: 'Clasificacion', value: 'Confidencial' },
    { label: 'Copia', value: 'Controlada' },
  ];

  const billingRows: DocumentDataRow[] = [
    { label: 'Consecutivo', value: invoice.invoiceNumber },
    { label: 'Estado de cobro', value: statusLabel[invoice.status] },
    { label: 'Fecha de emision', value: dateFormat(invoice.createdAt) },
    { label: 'Fecha de vencimiento', value: dateFormat(invoice.dueDate) },
  ];

  const amountRows: DocumentDataRow[] = [
    { label: 'Subtotal', value: moneyFormat(invoice.subtotal, invoice.currency) },
    { label: 'Descuento convenio', value: moneyFormat(invoice.agreementDiscountAmount, invoice.currency) },
    { label: 'Total final', value: moneyFormat(invoice.amount, invoice.currency) },
    { label: 'Moneda', value: invoice.currency },
  ];

  const timelineRows: DocumentTimelineRow[] = [
    {
      title: 'Registro de factura',
      value: dateFormat(invoice.createdAt),
      detail: 'Creacion inicial del documento de cobro dentro del panel administrativo.',
    },
    {
      title: invoice.sentAt ? 'Envio registrado' : 'Envio pendiente',
      value: invoice.sentAt ? dateFormat(invoice.sentAt) : 'Sin envio registrado',
      detail: invoice.sentAt
        ? 'La factura fue remitida al destinatario con enlace de pago.'
        : 'Todavia no se registra envio al destinatario desde el panel.',
    },
    {
      title: invoice.paidAt ? 'Pago confirmado' : 'Pago no confirmado',
      value: invoice.paidAt ? dateFormat(invoice.paidAt) : 'Sin confirmacion de pago',
      detail: invoice.paidAt
        ? 'Existe marca de pago en el historial del documento.'
        : 'La trazabilidad aun no reporta cierre por pago.',
    },
  ];

  const documentRows: DocumentDataRow[] = [
    { label: 'Codigo documental', value: INVOICE_DOCUMENT_CODE },
    { label: 'Version', value: `v${INVOICE_DOCUMENT_VERSION}` },
    { label: 'Estado', value: 'VIGENTE' },
    { label: 'Identificacion de copia', value: 'Copia controlada de uso interno' },
  ];

  const signatoryRows: DocumentSignatoryRow[] = [
    {
      role: 'Elaboro',
      signer: 'Coordinacion administrativa CyberVestigio',
      note: 'Preparacion del documento y consolidacion de datos del expediente.',
    },
    {
      role: 'Reviso',
      signer: 'Responsable SIG / Seguridad',
      note: 'Verificacion formal de contenido y control documental institucional.',
    },
    {
      role: 'Aprobo',
      signer: 'Direccion CyberVestigio',
      note: 'Aprobacion administrativa para remision o archivo.',
    },
  ];

  return {
    issuerRows,
    clientRows,
    controlRows,
    billingRows,
    amountRows,
    timelineRows,
    documentRows,
    signatoryRows,
    purpose:
      'Documento de control interno elaborado para presentar la relacion de cobro con trazabilidad, criterios documentales y una estructura compatible con el paquete institucional de formatos periciales.',
    agreementText: invoice.agreementDiscountApplied
      ? invoice.agreementEntity?.trim() || 'Descuento aplicado sin entidad especificada'
      : 'No se aplico descuento por convenio.',
    notesText: invoice.notes?.trim() || 'Sin notas adicionales registradas en el expediente.',
    legalNotice:
      'Acceso restringido a personal autorizado y partes legitimadas del caso. La informacion aqui contenida se emite para fines administrativos, soporte del expediente y remision controlada.',
  };
}