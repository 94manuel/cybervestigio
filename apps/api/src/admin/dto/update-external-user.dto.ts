import { PartialType } from '@nestjs/swagger';
import { CreateExternalUserDto } from './create-external-user.dto';

export class UpdateExternalUserDto extends PartialType(CreateExternalUserDto) {}
