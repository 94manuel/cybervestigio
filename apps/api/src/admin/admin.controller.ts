import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminRole } from '../generated/prisma/client';
import { Roles } from '../common/auth/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateBillingServiceDto } from './dto/create-billing-service.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateBillingServiceDto } from './dto/update-billing-service.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
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

  @Get('clients')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Listar clientes registrados para facturacion' })
  getClients(@Query('search') search?: string): Promise<object[]> {
    return this.adminService.getClients(search);
  }

  @Post('clients')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear cliente registrado' })
  createClient(@Body() dto: CreateClientDto): Promise<object> {
    return this.adminService.createClient(dto);
  }

  @Patch('clients/:id')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar cliente registrado' })
  updateClient(@Param('id') id: string, @Body() dto: UpdateClientDto): Promise<object> {
    return this.adminService.updateClient(id, dto);
  }

  @Get('billing-services')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Listar servicios de cobro configurables' })
  getBillingServices(): Promise<object[]> {
    return this.adminService.getBillingServices();
  }

  @Post('billing-services')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear servicio de cobro' })
  createBillingService(@Body() dto: CreateBillingServiceDto): Promise<object> {
    return this.adminService.createBillingService(dto);
  }

  @Patch('billing-services/:id')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar servicio de cobro' })
  updateBillingService(@Param('id') id: string, @Body() dto: UpdateBillingServiceDto): Promise<object> {
    return this.adminService.updateBillingService(id, dto);
  }

  @Get('invoices')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Listar facturas' })
  getInvoices(): Promise<object[]> {
    return this.adminService.getInvoices();
  }

  @Get('invoices/:id')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Consultar una factura' })
  getInvoice(@Param('id') id: string): Promise<object> {
    return this.adminService.getInvoice(id);
  }

  @Post('invoices')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear factura' })
  createInvoice(@Body() dto: CreateInvoiceDto): Promise<object> {
    return this.adminService.createInvoice(dto);
  }

  @Patch('invoices/:id')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar factura' })
  updateInvoice(@Param('id') id: string, @Body() dto: UpdateInvoiceDto): Promise<object> {
    return this.adminService.updateInvoice(id, dto);
  }

  @Post('invoices/:id/send')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Enviar factura por correo' })
  sendInvoice(@Param('id') id: string, @Body() dto: SendInvoiceDto): Promise<object> {
    return this.adminService.sendInvoice(id, dto);
  }

  @Get('invoices/export')
  @Roles(AdminRole.ADMIN, AdminRole.USER, AdminRole.SUPERVISOR)
  @ApiOperation({ summary: 'Exportar historial de facturas a Excel' })
  async exportInvoices(@Res() response: Response): Promise<void> {
    const file = await this.adminService.exportInvoicesWorkbook();
    response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.header('Content-Disposition', 'attachment; filename="facturas-cybervestigio.xlsx"');
    response.send(file);
  }
}
