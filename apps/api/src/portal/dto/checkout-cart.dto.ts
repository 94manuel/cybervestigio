import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentMethod } from '../../generated/prisma/client';

export class CheckoutCartDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.NEQUI })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ example: 'Pago desde Nequi app' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  paymentNotes?: string;
}
