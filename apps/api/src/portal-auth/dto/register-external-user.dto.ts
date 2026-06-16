import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterExternalUserDto {
  @ApiProperty({ example: 'Laura Moreno' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: 'laura.moreno@cliente.com' })
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({ example: 'ClaveSegura#2026' })
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password!: string;
}
