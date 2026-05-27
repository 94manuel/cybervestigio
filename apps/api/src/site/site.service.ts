import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const defaultSettings = {
  id: 'main',
  companyName: 'CyberVestigio',
  heroTitle: 'El vestigio digital que convierte los hechos en evidencia técnica.',
  heroDescription:
    'Investigación ciberforense con preservación, análisis e informes claros para organizaciones, abogados y personas que necesitan sustentar un caso digital.',
  contactEmail: 'contacto@cybervestigio.co',
  contactPhone: '+57 300 000 0000',
  location: 'Colombia',
};

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  async getHome(): Promise<object> {
    const [settings, services] = await Promise.all([
      this.prisma.siteSetting.findUnique({ where: { id: 'main' } }),
      this.prisma.service.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return {
      settings: settings ?? defaultSettings,
      services,
      principles: [
        {
          title: 'Trazabilidad',
          description: 'Registro organizado de recepción, transferencia, examen y entrega de evidencias.',
        },
        {
          title: 'Integridad',
          description: 'Aplicación de controles técnicos y valores hash para verificar la evidencia adquirida.',
        },
        {
          title: 'Confidencialidad',
          description: 'Manejo reservado y acceso restringido a la información entregada para análisis.',
        },
      ],
    };
  }

  getServices(): Promise<object[]> {
    return this.prisma.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getPublicInvoice(invoiceNumber: string): Promise<object> {
    const normalized = invoiceNumber.trim().toUpperCase();
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber: normalized },
      select: {
        invoiceNumber: true,
        customerName: true,
        description: true,
        lineItems: true,
        amount: true,
        currency: true,
        dueDate: true,
        status: true,
        paymentUrl: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada.');
    }

    return {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      description: invoice.description,
      lineItems: invoice.lineItems,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paymentUrl: invoice.paymentUrl,
    };
  }
}
