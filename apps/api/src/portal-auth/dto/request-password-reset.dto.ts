import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'laura.moreno@cliente.com' })
  @IsEmail()
  @MaxLength(180)
  email!: string;
}
