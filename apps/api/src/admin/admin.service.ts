import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import * as XLSX from 'xlsx';
import { ContactStatus, ExternalUserStatus, InvoiceStatus, Prisma, ReceiptStatus } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { CreateBillingServiceDto } from './dto/create-billing-service.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { CreateExpedienteUploadUrlDto } from './dto/create-expediente-upload-url.dto';
import { CreateExternalUserDto } from './dto/create-external-user.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateBillingServiceDto } from './dto/update-billing-service.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateExternalUserDto } from './dto/update-external-user.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateReceiptStatusDto } from './dto/update-receipt-status.dto';
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
    private readonly storageService: StorageService,
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

  private readonly externalUserSelection = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    status: true,
    mustChangePassword: true,
    drivePrefix: true,
    clientId: true,
    createdByAdminId: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  };

  private readonly expedienteSelection = {
    id: true,
    code: true,
    userId: true,
    orderId: true,
    createdByAdminId: true,
    title: true,
    description: true,
    status: true,
    minioPrefix: true,
    createdAt: true,
    updatedAt: true,
  };

  private readonly receiptSelection = {
    id: true,
    number: true,
    userId: true,
    expedienteId: true,
    orderId: true,
    status: true,
    amount: true,
    currency: true,
    dueDate: true,
    paidAt: true,
    notes: true,
    createdByAdminId: true,
    createdAt: true,
    updatedAt: true,
  };

  private decimalToNumber(value: Prisma.Decimal | number | string): number {
    return Number(value);
  }

  private createTemporaryPassword(): string {
    const entropy = randomBytes(6).toString('base64url');
    return `Cv-${entropy}-2026!`;
  }

  private async createExpedienteCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `EXP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const exists = await this.prisma.expediente.findUnique({
        where: { code: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }

    return `EXP-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  private async createReceiptNumber(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const exists = await this.prisma.receipt.findUnique({
        where: { number: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }

    return `REC-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;
  }

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

  getExternalUsers(search?: string): Promise<object[]> {
    const normalized = search?.trim();

    return this.prisma.externalUser.findMany({
      where: normalized
        ? {
            OR: [
              { fullName: { contains: normalized, mode: 'insensitive' } },
              { email: { contains: normalized, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        ...this.externalUserSelection,
        client: {
          select: {
            id: true,
            fullName: true,
            cedula: true,
            email: true,
          },
        },
      },
      take: 300,
    });
  }

  async createExternalUser(dto: CreateExternalUserDto, createdByAdminId?: string): Promise<object> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.externalUser.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new BadRequestException('Ya existe un usuario externo registrado con ese correo.');
    }

    let linkedClientId: string | undefined;
    const cedula = dto.clientCedula?.trim();
    if (cedula) {
      const client = await this.prisma.client.findUnique({ where: { cedula }, select: { id: true } });
      if (client) {
        linkedClientId = client.id;
      } else {
        const createdClient = await this.prisma.client.create({
          data: {
            fullName: dto.fullName.trim(),
            cedula,
            email,
            phone: dto.phone?.trim() || null,
            company: dto.company?.trim() || null,
            active: true,
          },
          select: { id: true },
        });
        linkedClientId = createdClient.id;
      }
    }

    const temporaryPassword = dto.password?.trim() || this.createTemporaryPassword();
    const mustChangePassword = !dto.password;

    const created = await this.prisma.externalUser.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone?.trim() || null,
        passwordHash: await hash(temporaryPassword, 12),
        status: dto.status ?? ExternalUserStatus.ACTIVE,
        mustChangePassword,
        drivePrefix: 'users/pending',
        createdByAdminId: createdByAdminId || null,
        clientId: linkedClientId,
      },
      select: this.externalUserSelection,
    });

    const updated = await this.prisma.externalUser.update({
      where: { id: created.id },
      data: { drivePrefix: `users/${created.id}` },
      select: this.externalUserSelection,
    });

    if (dto.notifyByEmail !== false) {
      await this.mailService.send(
        {
          to: updated.email,
          subject: 'Cuenta creada en CyberVestigio',
          text: [
            `Hola ${updated.fullName},`,
            '',
            'Un administrador creo su cuenta de cliente en CyberVestigio.',
            `Usuario: ${updated.email}`,
            `Contrasena: ${temporaryPassword}`,
            '',
            'Al iniciar sesion se enviara un codigo de doble factor a este mismo correo.',
          ].join('\n'),
          html: `
            <p>Hola ${updated.fullName},</p>
            <p>Un administrador creo su cuenta de cliente en CyberVestigio.</p>
            <ul>
              <li><strong>Usuario:</strong> ${updated.email}</li>
              <li><strong>Contrasena:</strong> ${temporaryPassword}</li>
            </ul>
            <p>Al iniciar sesion se enviara un codigo de doble factor a este mismo correo.</p>
          `,
        },
        'correo de creacion de cuenta externa',
      );
    }

    return {
      user: updated,
      generatedPassword: dto.password ? undefined : temporaryPassword,
    };
  }

  async updateExternalUser(id: string, dto: UpdateExternalUserDto): Promise<object> {
    const current = await this.prisma.externalUser.findUnique({ where: { id }, select: this.externalUserSelection });
    if (!current) {
      throw new NotFoundException('Usuario externo no encontrado.');
    }

    const nextEmail = dto.email?.toLowerCase().trim();
    if (nextEmail && nextEmail !== current.email) {
      const duplicate = await this.prisma.externalUser.findUnique({ where: { email: nextEmail }, select: { id: true } });
      if (duplicate) {
        throw new BadRequestException('Ya existe un usuario externo con ese correo.');
      }
    }

    let linkedClientId = current.clientId || undefined;
    const cedula = dto.clientCedula?.trim();
    if (cedula) {
      const client = await this.prisma.client.findUnique({ where: { cedula }, select: { id: true } });
      if (client) {
        linkedClientId = client.id;
      } else {
        const createdClient = await this.prisma.client.create({
          data: {
            fullName: dto.fullName?.trim() || current.fullName,
            cedula,
            email: nextEmail || current.email,
            phone: dto.phone?.trim() || current.phone || null,
            company: dto.company?.trim() || null,
            active: true,
          },
          select: { id: true },
        });
        linkedClientId = createdClient.id;
      }
    }

    const data: Prisma.ExternalUserUncheckedUpdateInput = {
      fullName: dto.fullName?.trim(),
      email: nextEmail,
      phone: dto.phone?.trim() || (dto.phone === '' ? null : undefined),
      status: dto.status,
      clientId: linkedClientId,
    };

    if (dto.password?.trim()) {
      data.passwordHash = await hash(dto.password.trim(), 12);
      data.mustChangePassword = true;
    }

    const updated = await this.prisma.externalUser.update({
      where: { id },
      data,
      select: this.externalUserSelection,
    });

    if (dto.notifyByEmail && dto.password?.trim()) {
      await this.mailService.send(
        {
          to: updated.email,
          subject: 'Actualizacion de acceso CyberVestigio',
          text: [
            `Hola ${updated.fullName},`,
            '',
            'Un administrador actualizo su acceso al portal de clientes.',
            `Usuario: ${updated.email}`,
            `Contrasena temporal: ${dto.password.trim()}`,
          ].join('\n'),
          html: `
            <p>Hola ${updated.fullName},</p>
            <p>Un administrador actualizo su acceso al portal de clientes.</p>
            <ul>
              <li><strong>Usuario:</strong> ${updated.email}</li>
              <li><strong>Contrasena temporal:</strong> ${dto.password.trim()}</li>
            </ul>
          `,
        },
        'correo de actualizacion de cuenta externa',
      );
    }

    return updated;
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

  async getExternalUserExpedientes(userId: string): Promise<object[]> {
    const user = await this.prisma.externalUser.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new NotFoundException('Usuario externo no encontrado.');
    }

    const expedientes = await this.prisma.expediente.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            total: true,
            currency: true,
            paidAt: true,
          },
        },
        receipts: {
          orderBy: { createdAt: 'desc' },
          select: this.receiptSelection,
        },
      },
    });

    return expedientes.map((expediente) => ({
      ...expediente,
      order: expediente.order
        ? {
            ...expediente.order,
            total: this.decimalToNumber(expediente.order.total),
          }
        : null,
      receipts: expediente.receipts.map((receipt) => ({
        ...receipt,
        amount: this.decimalToNumber(receipt.amount),
      })),
    }));
  }

  async createExternalUserExpediente(userId: string, dto: CreateExpedienteDto, createdByAdminId?: string): Promise<object> {
    const user = await this.prisma.externalUser.findUnique({
      where: { id: userId },
      select: { id: true, drivePrefix: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario externo no encontrado.');
    }

    let orderTotal = 0;
    if (dto.orderId) {
      const order = await this.prisma.serviceOrder.findFirst({
        where: { id: dto.orderId, userId },
        select: { id: true, total: true },
      });
      if (!order) {
        throw new NotFoundException('La orden asociada no existe para ese usuario.');
      }
      orderTotal = this.decimalToNumber(order.total);
    }

    const code = await this.createExpedienteCode();
    const minioPrefix = `${user.drivePrefix}/expedientes/${code}`;
    await this.storageService.ensureFolder(minioPrefix);

    const response = await this.prisma.$transaction(async (tx) => {
      const expediente = await tx.expediente.create({
        data: {
          code,
          userId,
          orderId: dto.orderId?.trim() || null,
          createdByAdminId: createdByAdminId || null,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          status: dto.status,
          minioPrefix,
        },
        select: this.expedienteSelection,
      });

      let receipt: null | object = null;

      if (dto.createReceipt) {
        const amount = dto.receiptAmount ?? orderTotal;
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new BadRequestException('Debe indicar un valor valido para el recibo del expediente.');
        }

        const number = dto.receiptNumber?.trim() || (await this.createReceiptNumber());
        const duplicate = await tx.receipt.findUnique({ where: { number }, select: { id: true } });
        if (duplicate) {
          throw new BadRequestException('Ya existe un recibo con ese numero.');
        }

        const createdReceipt = await tx.receipt.create({
          data: {
            number,
            userId,
            expedienteId: expediente.id,
            orderId: dto.orderId?.trim() || null,
            status: dto.receiptStatus ?? ReceiptStatus.POR_PAGAR,
            amount: new Prisma.Decimal(amount),
            currency: 'COP',
            dueDate: dto.receiptDueDate ? new Date(dto.receiptDueDate) : null,
            paidAt:
              (dto.receiptStatus ?? ReceiptStatus.POR_PAGAR) === ReceiptStatus.PAGADO
                ? new Date()
                : null,
            notes: dto.receiptNotes?.trim() || null,
            createdByAdminId: createdByAdminId || null,
          },
          select: this.receiptSelection,
        });

        receipt = {
          ...createdReceipt,
          amount: this.decimalToNumber(createdReceipt.amount),
        };
      }

      return { expediente, receipt };
    });

    return response;
  }

  async getReceipts(userId?: string): Promise<object[]> {
    const receipts = await this.prisma.receipt.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        ...this.receiptSelection,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return receipts.map((receipt) => ({
      ...receipt,
      amount: this.decimalToNumber(receipt.amount),
    }));
  }

  async updateReceiptStatus(id: string, dto: UpdateReceiptStatusDto, adminId?: string): Promise<object> {
    const current = await this.prisma.receipt.findUnique({ where: { id }, select: this.receiptSelection });
    if (!current) {
      throw new NotFoundException('Recibo no encontrado.');
    }

    const updated = await this.prisma.receipt.update({
      where: { id },
      data: {
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        paidAt:
          dto.status === ReceiptStatus.PAGADO
            ? (dto.paidAt ? new Date(dto.paidAt) : new Date())
            : dto.status === ReceiptStatus.POR_PAGAR || dto.status === ReceiptStatus.VENCIDO
              ? null
              : undefined,
        notes: dto.notes?.trim() || (dto.notes === '' ? null : undefined),
        createdByAdminId: adminId || current.createdByAdminId,
      },
      select: this.receiptSelection,
    });

    return {
      ...updated,
      amount: this.decimalToNumber(updated.amount),
    };
  }

  async getExpedienteFiles(expedienteId: string): Promise<object> {
    const expediente = await this.prisma.expediente.findUnique({
      where: { id: expedienteId },
      select: this.expedienteSelection,
    });

    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado.');
    }

    const files = await this.storageService.listFiles(expediente.minioPrefix);
    const filesWithLinks = await Promise.all(
      files.map(async (file) => ({
        ...file,
        downloadUrl: await this.storageService.getDownloadUrl(file.key),
        publicUrl: this.storageService.getPublicObjectUrl(file.key),
      })),
    );

    return {
      expediente,
      files: filesWithLinks,
    };
  }

  async createExpedienteUploadUrl(expedienteId: string, dto: CreateExpedienteUploadUrlDto): Promise<object> {
    const expediente = await this.prisma.expediente.findUnique({
      where: { id: expedienteId },
      select: this.expedienteSelection,
    });

    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado.');
    }

    const upload = await this.storageService.getUploadUrl(expediente.minioPrefix, dto.fileName, dto.contentType);

    return {
      expediente,
      ...upload,
      publicUrl: this.storageService.getPublicObjectUrl(upload.key),
      expiresInSeconds: 900,
    };
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
