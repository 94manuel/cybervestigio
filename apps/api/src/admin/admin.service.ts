import { Injectable } from '@nestjs/common';
import { ContactStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
}
