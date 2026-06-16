import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpedienteStatus, ReceiptStatus } from '../../generated/prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExpedienteDto {
  @ApiProperty({ example: 'Expediente analisis movil' })
  @IsString()
  @MaxLength(180)
  title!: string;

  @ApiPropertyOptional({ example: 'Expediente abierto por solicitud administrativa.' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({ example: 'id-order-relacionada' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ enum: ExpedienteStatus, example: ExpedienteStatus.ABIERTO })
  @IsOptional()
  @IsEnum(ExpedienteStatus)
  status?: ExpedienteStatus;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  createReceipt?: boolean;

  @ApiPropertyOptional({ example: 'RC-2026-00123' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  receiptNumber?: string;

  @ApiPropertyOptional({ example: 450000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  receiptAmount?: number;

  @ApiPropertyOptional({ enum: ReceiptStatus, example: ReceiptStatus.POR_PAGAR })
  @IsOptional()
  @IsEnum(ReceiptStatus)
  receiptStatus?: ReceiptStatus;

  @ApiPropertyOptional({ example: '2026-07-30T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  receiptDueDate?: string;

  @ApiPropertyOptional({ example: 'Recibo por apertura de expediente.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  receiptNotes?: string;
}
