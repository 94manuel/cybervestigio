import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PortalAuthService } from './portal-auth.service';
import { PortalLoginDto } from './dto/portal-login.dto';
import { RegisterExternalUserDto } from './dto/register-external-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyPortal2faDto } from './dto/verify-portal-2fa.dto';

@ApiTags('portal-auth')
@Controller('portal-auth')
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un cliente externo en el portal' })
  register(@Body() dto: RegisterExternalUserDto): Promise<object> {
    return this.portalAuthService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión de cliente y enviar código 2FA al correo' })
  @ApiResponse({ status: 200, description: 'Código 2FA enviado al correo del cliente.' })
  @ApiResponse({ status: 401, description: 'Credenciales no válidas.' })
  login(@Body() dto: PortalLoginDto): Promise<object> {
    return this.portalAuthService.login(dto);
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar código 2FA y entregar token del portal cliente' })
  verifyTwoFactor(@Body() dto: VerifyPortal2faDto): Promise<object> {
    return this.portalAuthService.verifyTwoFactor(dto);
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar código de recuperación de contraseña por correo' })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<object> {
    return this.portalAuthService.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña con código de recuperación' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<object> {
    return this.portalAuthService.resetPassword(dto);
  }
}
