import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBillingServiceDto {
  @ApiProperty({ example: '3.1 Consultoria, valoracion inicial y estrategia probatoria' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  sector!: string;

  @ApiProperty({ example: 'Consulta inicial remota' })
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  service!: string;

  @ApiProperty({ example: 'Reunion de hasta 45 minutos para conocer el caso.' })
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  scope!: string;

  @ApiProperty({ example: 180000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  recommendedPrice!: number;

  @ApiPropertyOptional({ example: 'desde' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  priceNote?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  sortOrder?: number;
}
