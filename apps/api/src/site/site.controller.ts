import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteService } from './site.service';

@ApiTags('site')
@Controller('site')
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get('home')
  @ApiOperation({ summary: 'Obtener contenido público para la página principal' })
  getHome(): Promise<object> {
    return this.siteService.getHome();
  }

  @Get('services')
  @ApiOperation({ summary: 'Listar servicios públicos activos' })
  getServices(): Promise<object[]> {
    return this.siteService.getServices();
  }

  @Get('invoices/:invoiceNumber')
  @ApiOperation({ summary: 'Consultar factura pública para pago' })
  getPublicInvoice(@Param('invoiceNumber') invoiceNumber: string): Promise<object> {
    return this.siteService.getPublicInvoice(invoiceNumber);
  }
}
