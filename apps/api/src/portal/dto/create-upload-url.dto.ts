import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateUploadUrlDto {
  @ApiProperty({ example: 'informe-preliminar.pdf' })
  @IsString()
  @MaxLength(200)
  fileName!: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contentType?: string;
}
