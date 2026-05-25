import { ApiProperty } from '@nestjs/swagger';
import { ContactStatus } from '../../generated/prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateContactStatusDto {
  @ApiProperty({ enum: ContactStatus, example: ContactStatus.IN_REVIEW })
  @IsEnum(ContactStatus)
  status!: ContactStatus;
}
