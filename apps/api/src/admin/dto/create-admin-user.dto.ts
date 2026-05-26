import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminRole } from '../../generated/prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'Analista Forense' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'analista@cybervestigio.co' })
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.USER })
  @IsEnum(AdminRole)
  role!: AdminRole;

  @ApiPropertyOptional({ example: 'Temporal-2026!' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password?: string;
}
