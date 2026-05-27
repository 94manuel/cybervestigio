import { PartialType } from '@nestjs/swagger';
import { CreateBillingServiceDto } from './create-billing-service.dto';

export class UpdateBillingServiceDto extends PartialType(CreateBillingServiceDto) {}
