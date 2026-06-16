import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PortalAuthenticatedRequest, PortalJwtAuthGuard } from '../common/guards/portal-jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { PortalService } from './portal.service';

@ApiTags('portal')
@ApiBearerAuth()
@UseGuards(PortalJwtAuthGuard)
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  private getUserId(request: PortalAuthenticatedRequest): string {
    return request.portalUser?.sub ?? '';
  }

  @Get('profile')
  @ApiOperation({ summary: 'Consultar perfil del cliente autenticado' })
  getProfile(@Req() request: PortalAuthenticatedRequest): Promise<object> {
    return this.portalService.getProfile(this.getUserId(request));
  }

  @Get('services')
  @ApiOperation({ summary: 'Listar servicios del portal con precio estimado para carrito' })
  getServices(): Promise<object[]> {
    return this.portalService.getServicesWithPricing();
  }

  @Get('cart')
  @ApiOperation({ summary: 'Consultar carrito activo del cliente' })
  getCart(@Req() request: PortalAuthenticatedRequest): Promise<object> {
    return this.portalService.getCart(this.getUserId(request));
  }

  @Post('cart/items')
  @ApiOperation({ summary: 'Agregar un servicio al carrito' })
  addCartItem(@Req() request: PortalAuthenticatedRequest, @Body() dto: AddCartItemDto): Promise<object> {
    return this.portalService.addCartItem(this.getUserId(request), dto);
  }

  @Patch('cart/items/:itemId')
  @ApiOperation({ summary: 'Actualizar cantidad de un item del carrito' })
  updateCartItem(
    @Req() request: PortalAuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<object> {
    return this.portalService.updateCartItem(this.getUserId(request), itemId, dto);
  }

  @Delete('cart/items/:itemId')
  @ApiOperation({ summary: 'Eliminar item del carrito' })
  removeCartItem(@Req() request: PortalAuthenticatedRequest, @Param('itemId') itemId: string): Promise<object> {
    return this.portalService.removeCartItem(this.getUserId(request), itemId);
  }

  @Post('cart/checkout')
  @ApiOperation({ summary: 'Cerrar carrito y generar orden de pago (Nequi, PSE, etc.)' })
  checkoutCart(@Req() request: PortalAuthenticatedRequest, @Body() dto: CheckoutCartDto): Promise<object> {
    return this.portalService.checkoutCart(this.getUserId(request), dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Listar ordenes del cliente' })
  getOrders(@Req() request: PortalAuthenticatedRequest): Promise<object[]> {
    return this.portalService.getOrders(this.getUserId(request));
  }

  @Post('orders/:orderId/pay')
  @ApiOperation({ summary: 'Confirmar pago de una orden y crear expediente asociado' })
  payOrder(
    @Req() request: PortalAuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: PayOrderDto,
  ): Promise<object> {
    return this.portalService.payOrder(this.getUserId(request), orderId, dto);
  }

  @Get('expedientes')
  @ApiOperation({ summary: 'Listar expedientes del cliente para vista tipo drive' })
  getExpedientes(@Req() request: PortalAuthenticatedRequest): Promise<object[]> {
    return this.portalService.getExpedientes(this.getUserId(request));
  }

  @Get('expedientes/:expedienteId/files')
  @ApiOperation({ summary: 'Listar archivos de un expediente en MinIO' })
  getExpedienteFiles(
    @Req() request: PortalAuthenticatedRequest,
    @Param('expedienteId') expedienteId: string,
  ): Promise<object> {
    return this.portalService.getExpedienteFiles(this.getUserId(request), expedienteId);
  }

  @Post('expedientes/:expedienteId/upload-url')
  @ApiOperation({ summary: 'Generar URL firmada para subir archivo al expediente en MinIO' })
  createUploadUrl(
    @Req() request: PortalAuthenticatedRequest,
    @Param('expedienteId') expedienteId: string,
    @Body() dto: CreateUploadUrlDto,
  ): Promise<object> {
    return this.portalService.createUploadUrl(this.getUserId(request), expedienteId, dto);
  }

  @Get('expedientes/:expedienteId/download-url')
  @ApiOperation({ summary: 'Generar URL firmada para descargar archivo del expediente' })
  createDownloadUrl(
    @Req() request: PortalAuthenticatedRequest,
    @Param('expedienteId') expedienteId: string,
    @Query('key') key: string,
  ): Promise<object> {
    return this.portalService.createDownloadUrl(this.getUserId(request), expedienteId, key);
  }
}
