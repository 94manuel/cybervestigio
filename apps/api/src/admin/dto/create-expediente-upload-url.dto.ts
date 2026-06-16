import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExpedienteUploadUrlDto {
  @ApiProperty({ example: 'evidencia-01.zip' })
  @IsString()
  @MaxLength(200)
  fileName!: string;

  @ApiPropertyOptional({ example: 'application/zip' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contentType?: string;
}
