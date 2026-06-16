import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExternalUserStatus } from '../../generated/prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateExternalUserDto {
  @ApiProperty({ example: 'Carlos Perez' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: 'carlos.perez@cliente.com' })
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'TemporalSegura#2026' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password?: string;

  @ApiPropertyOptional({ enum: ExternalUserStatus, example: ExternalUserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ExternalUserStatus)
  status?: ExternalUserStatus;

  @ApiPropertyOptional({ example: '1020304050' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  clientCedula?: string;

  @ApiPropertyOptional({ example: 'Empresa S.A.S.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  notifyByEmail?: boolean;
}
