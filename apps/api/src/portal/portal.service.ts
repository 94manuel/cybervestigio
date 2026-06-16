import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CartStatus,
  PaymentStatus,
  Prisma,
  ReceiptStatus,
  ServiceOrderStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class PortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  private decimalToNumber(value: Prisma.Decimal | number | string): number {
    return Number(value);
  }

  private parseDefaultServicePrice(): number {
    const raw = this.configService.get<string>('PORTAL_DEFAULT_SERVICE_PRICE')?.trim() || '250000';
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 250000;
  }

  private paymentInstruction(method: string): string {
    const nequi = this.configService.get<string>('PAYMENT_NEQUI_ACCOUNT')?.trim() || '3000000000';
    const daviplata = this.configService.get<string>('PAYMENT_DAVIPLATA_ACCOUNT')?.trim() || '3000000001';
    const transferencia = this.configService.get<string>('PAYMENT_TRANSFER_ACCOUNT')?.trim() || 'Banco / cuenta por definir';

    switch (method) {
      case 'NEQUI':
        return `Realice el pago a Nequi ${nequi} y reporte su referencia.`;
      case 'DAVIPLATA':
        return `Realice el pago a Daviplata ${daviplata} y reporte su referencia.`;
      case 'PSE':
        return 'Use su portal bancario PSE y reporte la referencia de transaccion.';
      case 'TARJETA':
        return 'Complete el pago con tarjeta en su pasarela corporativa y reporte referencia.';
      case 'EFECTIVO':
        return 'Coordine el pago presencial y registre el numero de recibo.';
      default:
        return `Transfiera al canal corporativo (${transferencia}) y registre referencia de pago.`;
    }
  }

  private async getUserOrThrow(userId: string) {
    const user = await this.prisma.externalUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        drivePrefix: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    return user;
  }

  private async generateOrderNumber(): Promise<string> {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const exists = await this.prisma.serviceOrder.findUnique({
        where: { orderNumber: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }
    throw new BadRequestException('No fue posible generar un numero de orden unico.');
  }

  private async generateExpedienteCode(): Promise<string> {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = `EXP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const exists = await this.prisma.expediente.findUnique({ where: { code: candidate }, select: { id: true } });
      if (!exists) return candidate;
    }
    throw new BadRequestException('No fue posible generar un codigo de expediente unico.');
  }

  private async generateReceiptNumber(): Promise<string> {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = `RC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
      const exists = await this.prisma.receipt.findUnique({ where: { number: candidate }, select: { id: true } });
      if (!exists) return candidate;
    }
    throw new BadRequestException('No fue posible generar un numero de recibo unico.');
  }

  private async getOrCreateActiveCart(userId: string) {
    const existing = await this.prisma.serviceCart.findFirst({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) return existing;

    return this.prisma.serviceCart.create({
      data: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  private mapCart(cart: {
    id: string;
    status: CartStatus;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      serviceId: string | null;
      serviceTitle: string;
      serviceDescription: string | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }): object {
    const items = cart.items.map((item) => ({
      ...item,
      unitPrice: this.decimalToNumber(item.unitPrice),
      lineTotal: this.decimalToNumber(item.lineTotal),
    }));

    const subtotal = Number(
      items.reduce((acc, item) => acc + this.decimalToNumber(item.lineTotal), 0).toFixed(2),
    );

    return {
      id: cart.id,
      status: cart.status,
      subtotal,
      total: subtotal,
      currency: 'COP',
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      items,
    };
  }

  private mapOrder(order: {
    id: string;
    orderNumber: string;
    status: ServiceOrderStatus;
    paymentMethod: string;
    paymentStatus: PaymentStatus;
    paymentReference: string | null;
    paymentNotes: string | null;
    subtotal: Prisma.Decimal;
    total: Prisma.Decimal;
    currency: string;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      serviceId: string | null;
      serviceTitle: string;
      serviceDescription: string | null;
      quantity: number;
      unitPrice: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
    }>;
    expediente?: {
      id: string;
      code: string;
      status: string;
      minioPrefix: string;
    } | null;
    receipts?: Array<{
      id: string;
      number: string;
      status: string;
      amount: Prisma.Decimal;
      currency: string;
      dueDate: Date | null;
      paidAt: Date | null;
    }>;
  }): object {
    return {
      ...order,
      subtotal: this.decimalToNumber(order.subtotal),
      total: this.decimalToNumber(order.total),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: this.decimalToNumber(item.unitPrice),
        lineTotal: this.decimalToNumber(item.lineTotal),
      })),
      receipts: (order.receipts ?? []).map((receipt) => ({
        ...receipt,
        amount: this.decimalToNumber(receipt.amount),
      })),
    };
  }

  async getProfile(userId: string): Promise<object> {
    return this.getUserOrThrow(userId);
  }

  async getServicesWithPricing(): Promise<object[]> {
    const [services, catalog] = await Promise.all([
      this.prisma.service.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.billingService.findMany({
        where: { active: true },
        select: { service: true, recommendedPrice: true },
      }),
    ]);

    const fallback = this.parseDefaultServicePrice();

    return services.map((service) => {
      const normalized = service.title.trim().toLowerCase();
      const catalogMatch = catalog.find((item) => {
        const candidate = item.service.trim().toLowerCase();
        return candidate.includes(normalized) || normalized.includes(candidate);
      });

      const estimatedPrice = catalogMatch ? this.decimalToNumber(catalogMatch.recommendedPrice) : fallback;

      return {
        ...service,
        estimatedPrice,
      };
    });
  }

  async getCart(userId: string): Promise<object> {
    await this.getUserOrThrow(userId);
    const cart = await this.getOrCreateActiveCart(userId);
    return this.mapCart(cart);
  }

  async addCartItem(userId: string, dto: AddCartItemDto): Promise<object> {
    await this.getUserOrThrow(userId);

    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        active: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });

    if (!service) {
      throw new NotFoundException('Servicio no encontrado o inactivo.');
    }

    const qty = dto.quantity ?? 1;
    const catalogPrice = await this.prisma.billingService.findFirst({
      where: {
        active: true,
        service: {
          contains: service.title,
          mode: 'insensitive',
        },
      },
      select: { recommendedPrice: true },
      orderBy: { sortOrder: 'asc' },
    });

    const unitPrice = Number(catalogPrice?.recommendedPrice ?? this.parseDefaultServicePrice());
    const cart = await this.getOrCreateActiveCart(userId);

    const existing = cart.items.find((item) => item.serviceId === service.id);
    if (existing) {
      const nextQuantity = existing.quantity + qty;
      await this.prisma.serviceCartItem.update({
        where: { id: existing.id },
        data: {
          quantity: nextQuantity,
          lineTotal: new Prisma.Decimal((unitPrice * nextQuantity).toFixed(2)),
        },
      });
    } else {
      await this.prisma.serviceCartItem.create({
        data: {
          cartId: cart.id,
          serviceId: service.id,
          serviceTitle: service.title,
          serviceDescription: service.description,
          quantity: qty,
          unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
          lineTotal: new Prisma.Decimal((unitPrice * qty).toFixed(2)),
        },
      });
    }

    return this.getCart(userId);
  }

  async updateCartItem(userId: string, itemId: string, dto: UpdateCartItemDto): Promise<object> {
    const item = await this.prisma.serviceCartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
          status: CartStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        unitPrice: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Item del carrito no encontrado.');
    }

    const quantity = dto.quantity;
    const unitPrice = this.decimalToNumber(item.unitPrice);
    await this.prisma.serviceCartItem.update({
      where: { id: item.id },
      data: {
        quantity,
        lineTotal: new Prisma.Decimal((unitPrice * quantity).toFixed(2)),
      },
    });

    return this.getCart(userId);
  }

  async removeCartItem(userId: string, itemId: string): Promise<object> {
    const item = await this.prisma.serviceCartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
          status: CartStatus.ACTIVE,
        },
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Item del carrito no encontrado.');
    }

    await this.prisma.serviceCartItem.delete({ where: { id: item.id } });
    return this.getCart(userId);
  }

  async checkoutCart(userId: string, dto: CheckoutCartDto): Promise<object> {
    await this.getUserOrThrow(userId);
    const cart = await this.getOrCreateActiveCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('No puede cerrar checkout con carrito vacio.');
    }

    const subtotal = Number(
      cart.items.reduce((acc, item) => acc + this.decimalToNumber(item.lineTotal), 0).toFixed(2),
    );
    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.serviceOrder.create({
        data: {
          orderNumber,
          userId,
          paymentMethod: dto.paymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          paymentNotes: dto.paymentNotes?.trim() || null,
          status: ServiceOrderStatus.PENDING_PAYMENT,
          subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
          total: new Prisma.Decimal(subtotal.toFixed(2)),
          currency: 'COP',
          items: {
            create: cart.items.map((item) => ({
              serviceId: item.serviceId,
              serviceTitle: item.serviceTitle,
              serviceDescription: item.serviceDescription,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      await tx.serviceCart.update({
        where: { id: cart.id },
        data: {
          status: CartStatus.CHECKED_OUT,
          checkedOutAt: new Date(),
        },
      });

      await tx.serviceCart.create({ data: { userId } });

      return created;
    });

    return {
      order: this.mapOrder(order),
      paymentInstructions: this.paymentInstruction(order.paymentMethod),
      nextStep: 'Reporte el pago para habilitar su expediente y carpeta drive.',
    };
  }

  async getOrders(userId: string): Promise<object[]> {
    await this.getUserOrThrow(userId);

    const orders = await this.prisma.serviceOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        expediente: {
          select: {
            id: true,
            code: true,
            status: true,
            minioPrefix: true,
          },
        },
        receipts: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            number: true,
            status: true,
            amount: true,
            currency: true,
            dueDate: true,
            paidAt: true,
          },
        },
      },
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async payOrder(userId: string, orderId: string, dto: PayOrderDto): Promise<object> {
    const user = await this.getUserOrThrow(userId);

    const order = await this.prisma.serviceOrder.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: true,
        expediente: {
          select: {
            id: true,
            code: true,
            status: true,
            minioPrefix: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada para este cliente.');
    }

    if (order.status === ServiceOrderStatus.PAID && order.expediente) {
      return {
        order: this.mapOrder(order),
        expediente: order.expediente,
        message: 'La orden ya estaba pagada y con expediente activo.',
      };
    }

    const expedienteCode = order.expediente?.code ?? (await this.generateExpedienteCode());
    const minioPrefix = order.expediente?.minioPrefix ?? `${user.drivePrefix}/expedientes/${expedienteCode}`;

    if (!order.expediente) {
      await this.storageService.ensureFolder(minioPrefix);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.serviceOrder.update({
        where: { id: order.id },
        data: {
          status: ServiceOrderStatus.PAID,
          paymentStatus: PaymentStatus.CONFIRMED,
          paymentReference: dto.paymentReference.trim(),
          paymentNotes: dto.paymentNotes?.trim() || order.paymentNotes,
          paidAt: new Date(),
        },
        include: {
          items: true,
          expediente: {
            select: {
              id: true,
              code: true,
              status: true,
              minioPrefix: true,
            },
          },
          receipts: {
            select: {
              id: true,
              number: true,
              status: true,
              amount: true,
              currency: true,
              dueDate: true,
              paidAt: true,
            },
          },
        },
      });

      let expediente = updatedOrder.expediente;

      if (!expediente) {
        expediente = await tx.expediente.create({
          data: {
            code: expedienteCode,
            userId: user.id,
            orderId: updatedOrder.id,
            title: `Expediente ${expedienteCode}`,
            description: 'Expediente generado automaticamente al confirmar el pago del servicio.',
            minioPrefix,
          },
          select: {
            id: true,
            code: true,
            status: true,
            minioPrefix: true,
          },
        });

        await tx.receipt.create({
          data: {
            number: await this.generateReceiptNumber(),
            userId: user.id,
            expedienteId: expediente.id,
            orderId: updatedOrder.id,
            status: ReceiptStatus.PAGADO,
            amount: updatedOrder.total,
            currency: updatedOrder.currency,
            paidAt: new Date(),
            notes: `Pago confirmado por cliente. Referencia ${dto.paymentReference.trim()}.`,
          },
        });
      }

      return {
        order: updatedOrder,
        expediente,
      };
    });

    return {
      order: this.mapOrder(result.order),
      expediente: result.expediente,
      message: 'Pago confirmado y expediente creado correctamente.',
    };
  }

  async getExpedientes(userId: string): Promise<object[]> {
    await this.getUserOrThrow(userId);

    const expedientes = await this.prisma.expediente.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            currency: true,
            paidAt: true,
          },
        },
        receipts: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            number: true,
            status: true,
            amount: true,
            currency: true,
            dueDate: true,
            paidAt: true,
          },
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

  async getExpedienteFiles(userId: string, expedienteId: string): Promise<object> {
    const expediente = await this.prisma.expediente.findFirst({
      where: {
        id: expedienteId,
        userId,
      },
      select: {
        id: true,
        code: true,
        minioPrefix: true,
      },
    });

    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado para este cliente.');
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

  async createUploadUrl(userId: string, expedienteId: string, dto: CreateUploadUrlDto): Promise<object> {
    const expediente = await this.prisma.expediente.findFirst({
      where: {
        id: expedienteId,
        userId,
      },
      select: {
        id: true,
        code: true,
        minioPrefix: true,
      },
    });

    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado para este cliente.');
    }

    const upload = await this.storageService.getUploadUrl(expediente.minioPrefix, dto.fileName, dto.contentType);

    return {
      expediente,
      ...upload,
      expiresInSeconds: 900,
    };
  }

  async createDownloadUrl(userId: string, expedienteId: string, key: string): Promise<object> {
    const expediente = await this.prisma.expediente.findFirst({
      where: {
        id: expedienteId,
        userId,
      },
      select: {
        id: true,
        code: true,
        minioPrefix: true,
      },
    });

    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado para este cliente.');
    }

    const normalizedKey = key.trim().replace(/^\/+/, '');
    if (!normalizedKey.startsWith(`${expediente.minioPrefix.replace(/\/$/, '')}/`)) {
      throw new ForbiddenException('El archivo solicitado no pertenece al expediente indicado.');
    }

    return {
      key: normalizedKey,
      downloadUrl: await this.storageService.getDownloadUrl(normalizedKey),
      expiresInSeconds: 900,
    };
  }
}
