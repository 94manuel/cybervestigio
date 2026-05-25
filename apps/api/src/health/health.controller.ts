import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Consultar estado básico del servicio' })
  check(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'cybervestigio-api',
      timestamp: new Date().toISOString(),
    };
  }
}
