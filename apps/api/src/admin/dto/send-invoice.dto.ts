import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendInvoiceDto {
  @ApiPropertyOptional({ example: 'cliente@dominio.com' })
  @IsOptional()
  @IsEmail()
  to?: string;

  @ApiPropertyOptional({ example: '4f806065-b2c0-4f82-bf9e-4f740c9a31a9' })
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiPropertyOptional({ example: 'a9088c7e-5e0d-4d52-a42b-e74fa0cbc42d' })
  @IsOptional()
  @IsUUID()
  recipientClientId?: string;

  @ApiPropertyOptional({ example: 'Adjuntamos su factura y enlace de pago.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
