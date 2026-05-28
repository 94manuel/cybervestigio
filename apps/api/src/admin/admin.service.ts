import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import * as XLSX from 'xlsx';
import { ContactStatus, InvoiceStatus, Prisma } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { CreateBillingServiceDto } from './dto/create-billing-service.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateBillingServiceDto } from './dto/update-billing-service.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto';

type NormalizedInvoiceLineItem = {
  title: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  serviceId?: string;
};

type InvoiceFinancials = {
  subtotal: number;
  discountAmount: number;
  total: number;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private readonly userSelection = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  };

  private readonly invoiceSelection = {
    id: true,
    invoiceNumber: true,
    customerClientId: true,
    customerName: true,
    customerEmail: true,
    customerPhone: true,
    company: true,
    description: true,
    lineItems: true,
    subtotal: true,
    agreementDiscountApplied: true,
    agreementEntity: true,
    agreementDiscountAmount: true,
    amount: true,
    currency: true,
    paymentUrl: true,
    dueDate: true,
    status: true,
    notes: true,
    sentAt: true,
    paidAt: true,
    createdAt: true,
    updatedAt: true,
  };

  private readonly billingServiceSelection = {
    id: true,
    sector: true,
    service: true,
    scope: true,
    recommendedPrice: true,
    priceNote: true,
    active: true,
    sortOrder: true,
    createdAt: true,
    updatedAt: true,
  };

  private readonly clientSelection = {
    id: true,
    fullName: true,
    cedula: true,
    email: true,
    phone: true,
    company: true,
    active: true,
    createdAt: true,
    updatedAt: true,
  };

  private normalizeLineItems(items?: Array<{ title: string; unitPrice: number; quantity?: number; serviceId?: string }>) {
    const normalized = (items ?? []).map((item) => {
      const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
      const unitPrice = Number(item.unitPrice);
      return {
        title: item.title.trim(),
        unitPrice,
        quantity,
        lineTotal: Number((unitPrice * quantity).toFixed(2)),
        serviceId: item.serviceId,
      };
    });

    if (normalized.length === 0) {
      throw new BadRequestException('Debe incluir al menos un servicio o concepto en la factura.');
    }

    return normalized;
  }

  private sumLineItems(lineItems: NormalizedInvoiceLineItem[]): number {
    return Number(lineItems.reduce((acc, item) => acc + item.lineTotal, 0).toFixed(2));
  }

  private calculateInvoiceFinancials(lineItems: NormalizedInvoiceLineItem[], agreementDiscountApplied: boolean, agreementDiscountAmount?: number): InvoiceFinancials {
    const subtotal = this.sumLineItems(lineItems);
    const requestedDiscount = Number(agreementDiscountAmount ?? 0);
    const discountAmount = agreementDiscountApplied
      ? Math.max(0, Math.min(subtotal, Number.isFinite(requestedDiscount) ? requestedDiscount : 0))
      : 0;
    return {
      subtotal,
      discountAmount,
      total: Number((subtotal - discountAmount).toFixed(2)),
    };
  }

  private normalizeInvoiceData(dto: CreateInvoiceDto | UpdateInvoiceDto): Prisma.InvoiceUncheckedCreateInput | Prisma.InvoiceUncheckedUpdateInput {
    const data: Prisma.InvoiceUncheckedCreateInput | Prisma.InvoiceUncheckedUpdateInput = {};

    if ('invoiceNumber' in dto && dto.invoiceNumber !== undefined) {
      data.invoiceNumber = dto.invoiceNumber.trim().toUpperCase();
    }
    if ('customerName' in dto && dto.customerName !== undefined) {
      data.customerName = dto.customerName.trim();
    }
    if ('customerClientId' in dto) {
      data.customerClientId = dto.customerClientId?.trim() || null;
    }
    if ('customerEmail' in dto && dto.customerEmail !== undefined) {
      data.customerEmail = dto.customerEmail.toLowerCase().trim();
    }
    if ('customerPhone' in dto) {
      data.customerPhone = dto.customerPhone?.trim() || null;
    }
    if ('company' in dto) {
      data.company = dto.company?.trim() || null;
    }
    if ('description' in dto && dto.description !== undefined) {
      data.description = dto.description.trim();
    }
    if ('currency' in dto) {
      data.currency = dto.currency?.trim().toUpperCase() || 'COP';
    }
    if ('dueDate' in dto && dto.dueDate !== undefined) {
      data.dueDate = new Date(dto.dueDate);
    }
    if ('status' in dto && dto.status !== undefined) {
      data.status = dto.status;
      data.paidAt = dto.status === InvoiceStatus.PAID ? new Date() : null;
    }
    if ('notes' in dto) {
      data.notes = dto.notes?.trim() || null;
    }
    if ('agreementDiscountApplied' in dto && dto.agreementDiscountApplied !== undefined) {
      data.agreementDiscountApplied = dto.agreementDiscountApplied;
    }
    if ('agreementEntity' in dto) {
      data.agreementEntity = dto.agreementEntity?.trim() || null;
    }
    if ('agreementDiscountAmount' in dto && dto.agreementDiscountAmount !== undefined) {
      data.agreementDiscountAmount = new Prisma.Decimal(dto.agreementDiscountAmount);
    }

    return data;
  }

  private async getInvoiceOrThrow(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: this.invoiceSelection,
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada.');
    }

    return invoice;
  }

  private getInvoicePortalUrl(invoiceNumber: string): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000';
    return `${frontendUrl.replace(/\/$/, '')}/facturas/${encodeURIComponent(invoiceNumber)}`;
  }

  private getInvoicePaymentUrl(invoiceNumber: string): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim() || 'http://localhost:3000';
    return `${frontendUrl.replace(/\/$/, '')}/facturas/${encodeURIComponent(invoiceNumber)}/pagar`;
  }

  async getDashboard(): Promise<object> {
    const [total, newContacts, reviewing, attended, latest, totalInvoices, pendingInvoices, paidInvoices] = await Promise.all([
      this.prisma.contactRequest.count(),
      this.prisma.contactRequest.count({ where: { status: ContactStatus.NEW } }),
      this.prisma.contactRequest.count({ where: { status: ContactStatus.IN_REVIEW } }),
      this.prisma.contactRequest.count({ where: { status: ContactStatus.ATTENDED } }),
      this.prisma.contactRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.invoice.count(),
      this.prisma.invoice.count({ where: { status: { in: [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.OVERDUE] } } }),
      this.prisma.invoice.count({ where: { status: InvoiceStatus.PAID } }),
    ]);

    return {
      metrics: { total, newContacts, reviewing, attended, totalInvoices, pendingInvoices, paidInvoices },
      latest,
    };
  }

  getContacts(): Promise<object[]> {
    return this.prisma.contactRequest.findMany({ orderBy: { createdAt: 'desc' } });
  }

  updateContactStatus(id: string, status: ContactStatus): Promise<object> {
    return this.prisma.contactRequest.update({
      where: { id },
      data: { status },
    });
  }

  getServices(): Promise<object[]> {
    return this.prisma.service.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  createService(dto: CreateServiceDto): Promise<object> {
    return this.prisma.service.create({ data: dto });
  }

  updateService(id: string, dto: UpdateServiceDto): Promise<object> {
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  deleteService(id: string): Promise<object> {
    return this.prisma.service.delete({ where: { id } });
  }

  getSettings(): Promise<object | null> {
    return this.prisma.siteSetting.findUnique({ where: { id: 'main' } });
  }

  updateSettings(dto: UpdateSiteSettingDto): Promise<object> {
    return this.prisma.siteSetting.upsert({
      where: { id: 'main' },
      update: dto,
      create: { id: 'main', ...dto },
    });
  }

  getUsers(): Promise<object[]> {
    return this.prisma.adminUser.findMany({
      select: this.userSelection,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(dto: CreateAdminUserDto): Promise<object> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Ya existe una cuenta con ese correo.');
    }

    const passwordHash = await hash(dto.password ?? 'Temporal-2026!', 12);

    return this.prisma.adminUser.create({
      data: {
        name: dto.name,
        email,
        role: dto.role,
        passwordHash,
      },
      select: this.userSelection,
    });
  }

  async updateUser(id: string, dto: UpdateAdminUserDto): Promise<object> {
    const current = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Cuenta no encontrada.');
    }

    const email = dto.email ? dto.email.toLowerCase() : undefined;
    if (email && email !== current.email) {
      const other = await this.prisma.adminUser.findUnique({ where: { email } });
      if (other) {
        throw new BadRequestException('Ya existe una cuenta con ese correo.');
      }
    }

    const data: {
      name?: string;
      email?: string;
      role?: UpdateAdminUserDto['role'];
      passwordHash?: string;
    } = {};

    if (dto.name) data.name = dto.name;
    if (email) data.email = email;
    if (dto.role) data.role = dto.role;
    if (dto.password) data.passwordHash = await hash(dto.password, 12);

    return this.prisma.adminUser.update({
      where: { id },
      data,
      select: this.userSelection,
    });
  }

  getClients(search?: string): Promise<object[]> {
    const normalized = search?.trim();
    return this.prisma.client.findMany({
      where: normalized
        ? {
            OR: [
              { fullName: { contains: normalized, mode: 'insensitive' } },
              { cedula: { contains: normalized, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: this.clientSelection,
      orderBy: [{ fullName: 'asc' }],
      take: 200,
    });
  }

  async createClient(dto: CreateClientDto): Promise<object> {
    const cedula = dto.cedula.trim();
    const existing = await this.prisma.client.findUnique({ where: { cedula } });
    if (existing) {
      throw new BadRequestException('Ya existe un cliente con esa cedula.');
    }

    return this.prisma.client.create({
      data: {
        fullName: dto.fullName.trim(),
        cedula,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone?.trim() || null,
        company: dto.company?.trim() || null,
        active: dto.active ?? true,
      },
      select: this.clientSelection,
    });
  }

  async updateClient(id: string, dto: UpdateClientDto): Promise<object> {
    const current = await this.prisma.client.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const cedula = dto.cedula?.trim();
    if (cedula && cedula !== current.cedula) {
      const duplicate = await this.prisma.client.findUnique({ where: { cedula } });
      if (duplicate) {
        throw new BadRequestException('Ya existe un cliente con esa cedula.');
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        cedula,
        email: dto.email?.toLowerCase().trim(),
        phone: dto.phone?.trim() || (dto.phone === '' ? null : undefined),
        company: dto.company?.trim() || (dto.company === '' ? null : undefined),
        active: dto.active,
      },
      select: this.clientSelection,
    });
  }

  getBillingServices(): Promise<object[]> {
    return this.prisma.billingService.findMany({
      select: this.billingServiceSelection,
      orderBy: [{ sortOrder: 'asc' }, { sector: 'asc' }, { service: 'asc' }],
      take: 1000,
    });
  }

  createBillingService(dto: CreateBillingServiceDto): Promise<object> {
    return this.prisma.billingService.create({
      data: {
        sector: dto.sector.trim(),
        service: dto.service.trim(),
        scope: dto.scope.trim(),
        recommendedPrice: new Prisma.Decimal(dto.recommendedPrice),
        priceNote: dto.priceNote?.trim() || null,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
      select: this.billingServiceSelection,
    });
  }

  updateBillingService(id: string, dto: UpdateBillingServiceDto): Promise<object> {
    return this.prisma.billingService.update({
      where: { id },
      data: {
        sector: dto.sector?.trim(),
        service: dto.service?.trim(),
        scope: dto.scope?.trim(),
        recommendedPrice: dto.recommendedPrice !== undefined ? new Prisma.Decimal(dto.recommendedPrice) : undefined,
        priceNote: dto.priceNote?.trim() || (dto.priceNote === '' ? null : undefined),
        active: dto.active,
        sortOrder: dto.sortOrder,
      },
      select: this.billingServiceSelection,
    });
  }

  getInvoices(): Promise<object[]> {
    return this.prisma.invoice.findMany({
      select: this.invoiceSelection,
      orderBy: { createdAt: 'desc' },
    });
  }

  getInvoice(id: string): Promise<object> {
    return this.getInvoiceOrThrow(id);
  }

  async createInvoice(dto: CreateInvoiceDto): Promise<object> {
    const invoiceNumber = dto.invoiceNumber.trim().toUpperCase();
    const existing = await this.prisma.invoice.findUnique({ where: { invoiceNumber } });
    if (existing) {
      throw new BadRequestException('Ya existe una factura con ese consecutivo.');
    }

    const normalizedItems = this.normalizeLineItems(dto.lineItems);
    const financials = this.calculateInvoiceFinancials(
      normalizedItems,
      Boolean(dto.agreementDiscountApplied),
      dto.agreementDiscountAmount,
    );

    if (dto.customerClientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.customerClientId } });
      if (!client) {
        throw new NotFoundException('Cliente registrado no encontrado.');
      }
    }

    return this.prisma.invoice.create({
      data: {
        ...(this.normalizeInvoiceData({ ...dto, invoiceNumber }) as Prisma.InvoiceUncheckedCreateInput),
        paymentUrl: this.getInvoicePaymentUrl(invoiceNumber),
        lineItems: normalizedItems as Prisma.InputJsonValue,
        subtotal: new Prisma.Decimal(financials.subtotal),
        agreementDiscountAmount: new Prisma.Decimal(financials.discountAmount),
        amount: new Prisma.Decimal(financials.total),
      },
      select: this.invoiceSelection,
    });
  }

  async updateInvoice(id: string, dto: UpdateInvoiceDto): Promise<object> {
    const current = await this.prisma.invoice.findUnique({ where: { id }, select: this.invoiceSelection });
    if (!current) {
      throw new NotFoundException('Factura no encontrada.');
    }

    const nextNumber = dto.invoiceNumber?.trim().toUpperCase();
    if (nextNumber && nextNumber !== current.invoiceNumber) {
      const duplicate = await this.prisma.invoice.findUnique({ where: { invoiceNumber: nextNumber } });
      if (duplicate) {
        throw new BadRequestException('Ya existe una factura con ese consecutivo.');
      }
    }

    if (dto.customerClientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.customerClientId } });
      if (!client) {
        throw new NotFoundException('Cliente registrado no encontrado.');
      }
    }

    const lineItems = dto.lineItems
      ? this.normalizeLineItems(dto.lineItems)
      : ((current.lineItems as unknown as NormalizedInvoiceLineItem[]) ?? []);

    const finalInvoiceNumber = nextNumber ?? current.invoiceNumber;

    const agreementDiscountApplied = dto.agreementDiscountApplied ?? current.agreementDiscountApplied;
    const agreementDiscountAmount =
      dto.agreementDiscountAmount !== undefined
        ? dto.agreementDiscountAmount
        : Number(current.agreementDiscountAmount);
    const financials = this.calculateInvoiceFinancials(lineItems, agreementDiscountApplied, agreementDiscountAmount);

    return this.prisma.invoice.update({
      where: { id },
      data: {
        ...(this.normalizeInvoiceData(dto) as Prisma.InvoiceUncheckedUpdateInput),
        paymentUrl: this.getInvoicePaymentUrl(finalInvoiceNumber),
        lineItems: lineItems as Prisma.InputJsonValue,
        subtotal: new Prisma.Decimal(financials.subtotal),
        agreementDiscountApplied,
        agreementDiscountAmount: new Prisma.Decimal(financials.discountAmount),
        amount: new Prisma.Decimal(financials.total),
      },
      select: this.invoiceSelection,
    });
  }

  async sendInvoice(id: string, dto: SendInvoiceDto): Promise<object> {
    const invoice = await this.getInvoiceOrThrow(id);

    let recipient = '';
    if (dto.recipientClientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.recipientClientId },
        select: { email: true },
      });
      if (!client) {
        throw new NotFoundException('Cliente destinatario no encontrado.');
      }
      recipient = client.email;
    }
    if (!recipient && dto.recipientUserId) {
      const user = await this.prisma.adminUser.findUnique({
        where: { id: dto.recipientUserId },
        select: { email: true },
      });
      if (!user) {
        throw new NotFoundException('Usuario destinatario no encontrado.');
      }
      recipient = user.email;
    }
    if (!recipient) recipient = dto.to?.trim() || '';
    recipient = recipient || invoice.customerEmail;

    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: invoice.currency,
      maximumFractionDigits: 2,
    }).format(Number(invoice.amount));

    const lineItems = (invoice.lineItems as unknown as NormalizedInvoiceLineItem[]) ?? [];
    const invoicePortalUrl = this.getInvoicePortalUrl(invoice.invoiceNumber);
    const lineItemsText = lineItems
      .map((item, index) => `${index + 1}. ${item.title} (${item.quantity}) - ${new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: invoice.currency,
        maximumFractionDigits: 2,
      }).format(item.lineTotal)}`)
      .join('\n');
    const lineItemsHtml = lineItems
      .map(
        (item) =>
          `<li><strong>${item.title}</strong> · Cantidad: ${item.quantity} · Valor: ${new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: invoice.currency,
            maximumFractionDigits: 2,
          }).format(item.lineTotal)}</li>`,
      )
      .join('');

    await this.mailService.send(
      {
        to: recipient,
        subject: `Factura ${invoice.invoiceNumber} - CyberVestigio`,
        text: [
          `Hola ${invoice.customerName},`,
          '',
          'Adjuntamos la informacion de su factura.',
          `Factura: ${invoice.invoiceNumber}`,
          `Valor: ${formattedAmount}`,
          `Vencimiento: ${invoice.dueDate.toISOString()}`,
          lineItemsText ? `Servicios/conceptos:\n${lineItemsText}` : '',
          `Portal de factura: ${invoicePortalUrl}`,
          `Boton de pago: ${invoice.paymentUrl}`,
          '',
          dto.message?.trim() || 'Puede realizar el pago en el enlace anterior.',
        ].join('\n'),
        html: `
          <p>Hola ${invoice.customerName},</p>
          <p>Adjuntamos la informacion de su factura.</p>
          <ul>
            <li><strong>Factura:</strong> ${invoice.invoiceNumber}</li>
            <li><strong>Valor:</strong> ${formattedAmount}</li>
            <li><strong>Vencimiento:</strong> ${invoice.dueDate.toLocaleDateString('es-CO')}</li>
          </ul>
          ${lineItemsHtml ? `<p><strong>Servicios y conceptos cobrados</strong></p><ul>${lineItemsHtml}</ul>` : ''}
          <p><a href="${invoicePortalUrl}">Ver factura en el sistema</a></p>
          <p><a href="${invoice.paymentUrl}" style="display:inline-block;padding:10px 16px;background:#0f4c81;color:#fff;border-radius:6px;text-decoration:none;">Pagar ahora</a></p>
          <p>${dto.message?.trim() || 'Puede realizar el pago desde el enlace anterior.'}</p>
        `,
      },
      'correo de la factura',
    );

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: invoice.status === InvoiceStatus.PAID ? InvoiceStatus.PAID : InvoiceStatus.SENT,
        sentAt: new Date(),
      },
      select: this.invoiceSelection,
    });
  }

  async exportInvoicesWorkbook(): Promise<Buffer> {
    const invoices = await this.prisma.invoice.findMany({
      select: this.invoiceSelection,
      orderBy: { createdAt: 'desc' },
    });

    const rows = invoices.map((invoice) => ({
      Factura: invoice.invoiceNumber,
      Cliente: invoice.customerName,
      Correo: invoice.customerEmail,
      ClienteRegistradoId: invoice.customerClientId ?? '',
      Telefono: invoice.customerPhone ?? '',
      Empresa: invoice.company ?? '',
      Descripcion: invoice.description,
      Servicios: JSON.stringify(invoice.lineItems),
      Subtotal: Number(invoice.subtotal),
      DescuentoConvenio: Number(invoice.agreementDiscountAmount),
      EntidadConvenio: invoice.agreementEntity ?? '',
      Valor: Number(invoice.amount),
      Moneda: invoice.currency,
      Estado: invoice.status,
      Pago: invoice.paymentUrl,
      Vence: invoice.dueDate.toISOString(),
      Enviada: invoice.sentAt?.toISOString() ?? '',
      Pagada: invoice.paidAt?.toISOString() ?? '',
      Notas: invoice.notes ?? '',
      Creada: invoice.createdAt.toISOString(),
      Actualizada: invoice.updatedAt.toISOString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturas');
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  }
}
