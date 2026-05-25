import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

export interface ContactCreatedResponse {
  success: boolean;
  reference?: string;
  message: string;
}

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactDto): Promise<ContactCreatedResponse> {
    if (dto.website) {
      return {
        success: true,
        message: 'Solicitud recibida correctamente.',
      };
    }

    if (!dto.consent) {
      throw new BadRequestException('Debe autorizar el tratamiento de datos para enviar la solicitud.');
    }

    const request = await this.prisma.contactRequest.create({
      data: {
        fullName: dto.fullName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        company: dto.company,
        service: dto.service,
        message: dto.message,
        consent: dto.consent,
      },
      select: { id: true },
    });

    return {
      success: true,
      reference: request.id.slice(0, 8).toUpperCase(),
      message: 'Solicitud registrada. Nuestro equipo podrá revisar su información de contacto.',
    };
  }
}
