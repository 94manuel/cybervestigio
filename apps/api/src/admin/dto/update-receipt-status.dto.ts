import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReceiptStatus } from '../../generated/prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReceiptStatusDto {
  @ApiProperty({ enum: ReceiptStatus, example: ReceiptStatus.PAGADO })
  @IsEnum(ReceiptStatus)
  status!: ReceiptStatus;

  @ApiPropertyOptional({ example: '2026-06-16T20:50:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ example: '2026-07-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'Pago confirmado por Nequi.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
