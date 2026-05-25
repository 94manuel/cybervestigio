import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'analisis-forense' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug debe utilizar minúsculas, números y guiones.',
  })
  @MaxLength(80)
  slug!: string;

  @ApiProperty({ example: 'Análisis forense' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'Descripción del servicio ofrecido.' })
  @IsString()
  @MinLength(15)
  @MaxLength(600)
  description!: string;

  @ApiProperty({ example: 'search' })
  @IsString()
  @MaxLength(40)
  icon!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
