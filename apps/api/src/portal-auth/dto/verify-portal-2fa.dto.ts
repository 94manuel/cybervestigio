import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MaxLength } from 'class-validator';

export class VerifyPortal2faDto {
  @ApiProperty({ description: 'Token temporal generado en el login inicial.' })
  @IsString()
  @MaxLength(1024)
  challengeToken!: string;

  @ApiProperty({ example: '483921' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
