import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '../generated/prisma/client';
import { Roles } from '../common/auth/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Consultar indicadores administrativos' })
  getDashboard(): Promise<object> {
    return this.adminService.getDashboard();
  }

  @Get('contacts')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Listar solicitudes de contacto' })
  getContacts(): Promise<object[]> {
    return this.adminService.getContacts();
  }

  @Patch('contacts/:id/status')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar estado de una solicitud' })
  updateContactStatus(@Param('id') id: string, @Body() dto: UpdateContactStatusDto): Promise<object> {
    return this.adminService.updateContactStatus(id, dto.status);
  }

  @Get('services')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Listar servicios para administración' })
  getServices(): Promise<object[]> {
    return this.adminService.getServices();
  }

  @Post('services')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear servicio' })
  createService(@Body() dto: CreateServiceDto): Promise<object> {
    return this.adminService.createService(dto);
  }

  @Patch('services/:id')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Editar servicio' })
  updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto): Promise<object> {
    return this.adminService.updateService(id, dto);
  }

  @Delete('services/:id')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Eliminar servicio' })
  deleteService(@Param('id') id: string): Promise<object> {
    return this.adminService.deleteService(id);
  }

  @Get('settings')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Consultar contenido corporativo editable' })
  getSettings(): Promise<object | null> {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar contenido corporativo editable' })
  updateSettings(@Body() dto: UpdateSiteSettingDto): Promise<object> {
    return this.adminService.updateSettings(dto);
  }

  @Get('users')
  @Roles(AdminRole.ADMIN)
  @ApiOperation({ summary: 'Listar cuentas administrativas' })
  getUsers(): Promise<object[]> {
    return this.adminService.getUsers();
  }

  @Post('users')
  @Roles(AdminRole.ADMIN)
  @ApiOperation({ summary: 'Crear cuenta administrativa' })
  createUser(@Body() dto: CreateAdminUserDto): Promise<object> {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @Roles(AdminRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar cuenta administrativa' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto): Promise<object> {
    return this.adminService.updateUser(id, dto);
  }
}
