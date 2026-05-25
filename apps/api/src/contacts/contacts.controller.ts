import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactCreatedResponse, ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar solicitud pública de contacto' })
  @ApiCreatedResponse({ description: 'Solicitud recibida.' })
  create(@Body() dto: CreateContactDto): Promise<ContactCreatedResponse> {
    return this.contactsService.create(dto);
  }
}
