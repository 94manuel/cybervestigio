import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PayOrderDto {
  @ApiProperty({ example: 'TRX-NEQUI-20260616-0001' })
  @IsString()
  @MaxLength(120)
  paymentReference!: string;

  @ApiPropertyOptional({ example: 'Pago reportado por app Nequi' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  paymentNotes?: string;
}
