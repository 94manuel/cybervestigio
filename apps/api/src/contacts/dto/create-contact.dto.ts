import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'María Pérez' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: 'maria@empresa.co' })
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiPropertyOptional({ example: '+57 310 000 0000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'Firma Jurídica ABC' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @ApiProperty({ example: 'Informática forense' })
  @IsString()
  @MaxLength(120)
  service!: string;

  @ApiProperty({ example: 'Necesito preservar y analizar información digital...' })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  message!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  consent!: boolean;

  @ApiPropertyOptional({ description: 'Campo de protección antibot; debe permanecer vacío.' })
  @IsOptional()
  @IsString()
  website?: string;
}
