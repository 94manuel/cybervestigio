import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @MinLength(3)
  @MaxLength(140)
  fullName!: string;

  @ApiProperty({ example: '1020304050' })
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  cedula!: string;

  @ApiProperty({ example: 'cliente@dominio.com' })
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiPropertyOptional({ example: '+57 300 000 0000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: 'Empresa SAS' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
