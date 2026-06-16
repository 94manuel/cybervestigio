import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'laura.moreno@cliente.com' })
  @IsEmail()
  @MaxLength(180)
  email!: string;

  @ApiProperty({ example: '483921' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: 'NuevaClaveSegura#2026' })
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  newPassword!: string;
}
