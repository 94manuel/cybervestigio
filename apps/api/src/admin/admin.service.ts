import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { ContactStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly userSelection = {
    id: true,
    name: true,
    email: true,
    role: true,
    createdAt: true,
    updatedAt: true,
  };

  async getDashboard(): Promise<object> {
    const [total, newContacts, reviewing, attended, latest] = await Promise.all([
      this.prisma.contactRequest.count(),
      this.prisma.contactRequest.count({ where: { status: ContactStatus.NEW } }),
      this.prisma.contactRequest.count({ where: { status: ContactStatus.IN_REVIEW } }),
      this.prisma.contactRequest.count({ where: { status: ContactStatus.ATTENDED } }),
      this.prisma.contactRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    return {
      metrics: { total, newContacts, reviewing, attended },
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
}
