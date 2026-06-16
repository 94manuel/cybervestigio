import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PortalAuthController } from './portal-auth.controller';
import { PortalAuthService } from './portal-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [PortalAuthController],
  providers: [PortalAuthService],
  exports: [PortalAuthService],
})
export class PortalAuthModule {}
