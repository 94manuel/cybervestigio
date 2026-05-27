import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class InvoiceLineItemDto {
  @ApiProperty({ example: 'Informatica forense en portatil corporativo' })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @ApiProperty({ example: 1500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional({ example: '4f806065-b2c0-4f82-bf9e-4f740c9a31a9' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}
