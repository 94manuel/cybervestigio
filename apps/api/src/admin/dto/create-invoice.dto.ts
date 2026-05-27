import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../../generated/prisma/client';
import {
  ArrayMinSize,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceLineItemDto } from './invoice-line-item.dto';

export class CreateInvoiceDto {
  @ApiProperty({ example: 'FAC-2026-0001' })
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  invoiceNumber!: string;

  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  customerName!: string;

  @ApiPropertyOptional({ example: '4f806065-b2c0-4f82-bf9e-4f740c9a31a9' })
  @IsOptional()
  @IsUUID()
  customerClientId?: string;

  @ApiProperty({ example: 'cliente@dominio.com' })
  @IsEmail()
  @MaxLength(180)
  customerEmail!: string;

  @ApiPropertyOptional({ example: '+57 300 000 0000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'Empresa SAS' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @ApiProperty({ example: 'Peritaje forense sobre equipo portatil y cadena de custodia.' })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @ApiProperty({ type: [InvoiceLineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems!: InvoiceLineItemDto[];

  @ApiProperty({ example: 1500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ example: 'COP' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @ApiProperty({ example: '2026-06-30T23:59:59.000Z' })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({ enum: InvoiceStatus, example: InvoiceStatus.DRAFT })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ example: 'Pago contra entrega del informe.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  agreementDiscountApplied?: boolean;

  @ApiPropertyOptional({ example: 'Convenio Colegio de Abogados' })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  agreementEntity?: string;

  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  agreementDiscountAmount?: number;
}
