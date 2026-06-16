import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { ExternalUserStatus } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { PortalLoginDto } from './dto/portal-login.dto';
import { RegisterExternalUserDto } from './dto/register-external-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyPortal2faDto } from './dto/verify-portal-2fa.dto';

type PortalChallengePayload = {
  sub: string;
  email: string;
  type: 'portal-2fa';
};

@Injectable()
export class PortalAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private createSixDigitCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private getPortalTokenTtl(): StringValue {
    return (this.configService.get<string>('JWT_EXPIRES_IN')?.trim() || '8h') as StringValue;
  }

  async register(dto: RegisterExternalUserDto): Promise<object> {
    const email = this.normalizeEmail(dto.email);
    const exists = await this.prisma.externalUser.findUnique({ where: { email }, select: { id: true } });
    if (exists) {
      throw new BadRequestException('Ya existe una cuenta de cliente con ese correo.');
    }

    const id = randomUUID();
    const fullName = dto.fullName.trim();

    const created = await this.prisma.externalUser.create({
      data: {
        id,
        fullName,
        email,
        phone: dto.phone?.trim() || null,
        passwordHash: await hash(dto.password, 12),
        status: ExternalUserStatus.ACTIVE,
        mustChangePassword: false,
        drivePrefix: `users/${id}`,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
      },
    });

    await this.mailService.send(
      {
        to: created.email,
        subject: 'Cuenta creada en CyberVestigio',
        text: [
          `Hola ${created.fullName},`,
          '',
          'Su cuenta de cliente fue creada correctamente en CyberVestigio.',
          'Desde ahora puede iniciar sesion y solicitar servicios desde el carrito.',
          '',
          'Este acceso tiene verificacion en dos pasos por correo para proteger sus expedientes.',
        ].join('\n'),
        html: `
          <p>Hola ${created.fullName},</p>
          <p>Su cuenta de cliente fue creada correctamente en CyberVestigio.</p>
          <p>Desde ahora puede iniciar sesion y solicitar servicios desde el carrito.</p>
          <p>Este acceso tiene verificacion en dos pasos por correo para proteger sus expedientes.</p>
        `,
      },
      'correo de bienvenida de cliente',
    );

    return {
      user: created,
      message: 'Cuenta creada correctamente. Revise su correo para confirmar la activacion del portal.',
    };
  }

  async login(dto: PortalLoginDto): Promise<object> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.externalUser.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        passwordHash: true,
      },
    });

    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales no validas para el portal de clientes.');
    }

    if (user.status === ExternalUserStatus.BLOCKED) {
      throw new UnauthorizedException('Su cuenta se encuentra bloqueada. Contacte al administrador.');
    }

    const code = this.createSixDigitCode();
    const codeHash = await hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.externalUser.update({
      where: { id: user.id },
      data: {
        twoFactorCodeHash: codeHash,
        twoFactorExpiresAt: expiresAt,
      },
    });

    await this.mailService.send(
      {
        to: user.email,
        subject: 'Codigo de verificacion de CyberVestigio',
        text: [
          `Hola ${user.fullName},`,
          '',
          `Su codigo de ingreso es: ${code}`,
          'Este codigo vence en 10 minutos.',
          'Si no solicitó este acceso, ignore el mensaje.',
        ].join('\n'),
        html: `
          <p>Hola ${user.fullName},</p>
          <p>Su codigo de ingreso es <strong>${code}</strong>.</p>
          <p>Este codigo vence en 10 minutos.</p>
          <p>Si no solicitó este acceso, ignore el mensaje.</p>
        `,
      },
      'codigo 2FA de cliente',
    );

    const challengeToken = await this.jwtService.signAsync<PortalChallengePayload>(
      {
        sub: user.id,
        email: user.email,
        type: 'portal-2fa',
      },
      { expiresIn: '10m' },
    );

    return {
      twoFactorRequired: true,
      challengeToken,
      expiresInMinutes: 10,
      email: user.email,
    };
  }

  async verifyTwoFactor(dto: VerifyPortal2faDto): Promise<object> {
    let challenge: PortalChallengePayload;
    try {
      challenge = await this.jwtService.verifyAsync<PortalChallengePayload>(dto.challengeToken);
    } catch {
      throw new UnauthorizedException('El token de verificacion del segundo factor es invalido o expirado.');
    }

    if (challenge.type !== 'portal-2fa') {
      throw new UnauthorizedException('Token de verificacion no valido.');
    }

    const user = await this.prisma.externalUser.findUnique({
      where: { id: challenge.sub },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        mustChangePassword: true,
        twoFactorCodeHash: true,
        twoFactorExpiresAt: true,
      },
    });

    if (!user || !user.twoFactorCodeHash || !user.twoFactorExpiresAt) {
      throw new UnauthorizedException('Codigo de verificacion no disponible. Solicite un nuevo ingreso.');
    }

    if (user.twoFactorExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('El codigo de verificacion ya expiró.');
    }

    if (!(await compare(dto.code, user.twoFactorCodeHash))) {
      throw new UnauthorizedException('Codigo de verificacion incorrecto.');
    }

    await this.prisma.externalUser.update({
      where: { id: user.id },
      data: {
        status: ExternalUserStatus.ACTIVE,
        lastLoginAt: new Date(),
        twoFactorCodeHash: null,
        twoFactorExpiresAt: null,
      },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        name: user.fullName,
        role: 'CLIENT',
        type: 'portal',
      },
      { expiresIn: this.getPortalTokenTtl() },
    );

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<object> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.externalUser.findUnique({
      where: { email },
      select: { id: true, fullName: true, email: true },
    });

    if (user) {
      const code = this.createSixDigitCode();
      const codeHash = await hash(code, 10);
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

      await this.prisma.externalUser.update({
        where: { id: user.id },
        data: {
          passwordResetCodeHash: codeHash,
          passwordResetExpiresAt: expiresAt,
        },
      });

      await this.mailService.send(
        {
          to: user.email,
          subject: 'Recuperacion de cuenta CyberVestigio',
          text: [
            `Hola ${user.fullName},`,
            '',
            `Su codigo de recuperacion es: ${code}`,
            'Este codigo vence en 20 minutos.',
          ].join('\n'),
          html: `
            <p>Hola ${user.fullName},</p>
            <p>Su codigo de recuperacion es <strong>${code}</strong>.</p>
            <p>Este codigo vence en 20 minutos.</p>
          `,
        },
        'codigo de recuperacion de cliente',
      );
    }

    return {
      message: 'Si la cuenta existe, enviaremos un codigo de recuperacion al correo registrado.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<object> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.externalUser.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        passwordResetCodeHash: true,
        passwordResetExpiresAt: true,
      },
    });

    if (!user || !user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      throw new BadRequestException('No existe una solicitud de recuperacion activa para este correo.');
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('El codigo de recuperacion expiró. Solicite uno nuevo.');
    }

    if (!(await compare(dto.code, user.passwordResetCodeHash))) {
      throw new BadRequestException('El codigo de recuperacion es invalido.');
    }

    await this.prisma.externalUser.update({
      where: { id: user.id },
      data: {
        passwordHash: await hash(dto.newPassword, 12),
        mustChangePassword: false,
        status: ExternalUserStatus.ACTIVE,
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
      },
    });

    await this.mailService.send(
      {
        to: user.email,
        subject: 'Contrasena actualizada en CyberVestigio',
        text: [
          `Hola ${user.fullName},`,
          '',
          'Su contrasena fue actualizada correctamente en el portal de clientes.',
        ].join('\n'),
        html: `
          <p>Hola ${user.fullName},</p>
          <p>Su contrasena fue actualizada correctamente en el portal de clientes.</p>
        `,
      },
      'confirmacion de recuperacion de cliente',
    );

    return {
      message: 'Contrasena actualizada correctamente. Ahora puede iniciar sesion.',
    };
  }
}
