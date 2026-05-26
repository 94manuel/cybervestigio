import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AdminRole } from '../../generated/prisma/client';

export interface AdminTokenPayload {
  sub: string;
  email: string;
  role: AdminRole;
  name: string;
}

export type AuthenticatedRequest = Request & { user?: AdminTokenPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token administrativo requerido.');
    }

    try {
      request.user = await this.jwtService.verifyAsync<AdminTokenPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token administrativo inválido o expirado.');
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
