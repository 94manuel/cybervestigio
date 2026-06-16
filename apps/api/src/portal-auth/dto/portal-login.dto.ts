import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class PortalLoginDto {
  @ApiProperty({ example: 'laura.moreno@cliente.com' })
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiProperty({ example: 'ClaveSegura#2026' })
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  password!: string;
}
