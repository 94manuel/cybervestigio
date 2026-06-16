import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = (config.get<string>('JWT_EXPIRES_IN')?.trim() || '8h') as StringValue;
        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  providers: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
