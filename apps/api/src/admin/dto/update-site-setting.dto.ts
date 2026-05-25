import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSiteSettingDto {
  @ApiProperty({ example: 'CyberVestigio' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  companyName!: string;

  @ApiProperty({ example: 'El vestigio digital que convierte los hechos en evidencia técnica.' })
  @IsString()
  @MinLength(15)
  @MaxLength(180)
  heroTitle!: string;

  @ApiProperty({ example: 'Investigación ciberforense con preservación...' })
  @IsString()
  @MinLength(30)
  @MaxLength(500)
  heroDescription!: string;

  @ApiProperty({ example: 'contacto@cybervestigio.co' })
  @IsEmail()
  contactEmail!: string;

  @ApiPropertyOptional({ example: '+57 300 000 0000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @ApiProperty({ example: 'Colombia' })
  @IsString()
  @MaxLength(120)
  location!: string;
}
