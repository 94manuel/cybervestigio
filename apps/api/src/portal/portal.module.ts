import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PortalJwtAuthGuard } from '../common/guards/portal-jwt-auth.guard';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [AuthModule],
  controllers: [PortalController],
  providers: [PortalService, PortalJwtAuthGuard],
})
export class PortalModule {}
