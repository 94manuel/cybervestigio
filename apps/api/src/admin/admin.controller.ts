import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Consultar indicadores administrativos' })
  getDashboard(): Promise<object> {
    return this.adminService.getDashboard();
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Listar solicitudes de contacto' })
  getContacts(): Promise<object[]> {
    return this.adminService.getContacts();
  }

  @Patch('contacts/:id/status')
  @ApiOperation({ summary: 'Actualizar estado de una solicitud' })
  updateContactStatus(@Param('id') id: string, @Body() dto: UpdateContactStatusDto): Promise<object> {
    return this.adminService.updateContactStatus(id, dto.status);
  }

  @Get('services')
  @ApiOperation({ summary: 'Listar servicios para administración' })
  getServices(): Promise<object[]> {
    return this.adminService.getServices();
  }

  @Post('services')
  @ApiOperation({ summary: 'Crear servicio' })
  createService(@Body() dto: CreateServiceDto): Promise<object> {
    return this.adminService.createService(dto);
  }

  @Patch('services/:id')
  @ApiOperation({ summary: 'Editar servicio' })
  updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto): Promise<object> {
    return this.adminService.updateService(id, dto);
  }

  @Delete('services/:id')
  @ApiOperation({ summary: 'Eliminar servicio' })
  deleteService(@Param('id') id: string): Promise<object> {
    return this.adminService.deleteService(id);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Consultar contenido corporativo editable' })
  getSettings(): Promise<object | null> {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Actualizar contenido corporativo editable' })
  updateSettings(@Body() dto: UpdateSiteSettingDto): Promise<object> {
    return this.adminService.updateSettings(dto);
  }
}
