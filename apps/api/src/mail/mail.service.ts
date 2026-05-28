import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  private getTransportConfig() {
    const host = this.configService.get<string>('SMTP_HOST')?.trim();
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService.get<string>('SMTP_PASS')?.trim();
    const from = this.configService.get<string>('SMTP_FROM')?.trim();
    const port = this.configService.get<number>('SMTP_PORT') ?? 587;
    const secure = this.configService.get<boolean>('SMTP_SECURE') ?? false;

    if (!host || !from) {
      throw new BadRequestException('SMTP_HOST y SMTP_FROM son obligatorios para enviar correos.');
    }

    if ((user && !pass) || (!user && pass)) {
      throw new BadRequestException('SMTP_USER y SMTP_PASS deben configurarse juntos para autenticar el envio de correos.');
    }

    return {
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      from,
    };
  }

  async send(message: SendMailOptions, errorLabel = 'correo'): Promise<void> {
    const smtp = this.getTransportConfig();
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.auth,
    });

    try {
      await transporter.sendMail({
        ...message,
        from: message.from ?? smtp.from,
      });
    } catch (error) {
      throw new InternalServerErrorException(`No fue posible enviar el ${errorLabel}. ${(error as Error).message}`);
    }
  }
}