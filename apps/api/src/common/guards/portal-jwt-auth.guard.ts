import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface PortalTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: 'CLIENT';
  type: 'portal';
}

export type PortalAuthenticatedRequest = Request & { portalUser?: PortalTokenPayload };

@Injectable()
export class PortalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PortalAuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de cliente requerido.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PortalTokenPayload>(token);
      if (payload.type !== 'portal' || payload.role !== 'CLIENT') {
        throw new UnauthorizedException('Token de cliente invalido.');
      }
      request.portalUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token de cliente invalido o expirado.');
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
