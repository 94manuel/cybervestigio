import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ContactsModule } from './contacts/contacts.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';
import { PortalAuthModule } from './portal-auth/portal-auth.module';
import { PortalModule } from './portal/portal.module';
import { PrismaModule } from './prisma/prisma.module';
import { SiteModule } from './site/site.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().default(4000),
        FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('8h'),
        REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).default('redis://localhost:6379'),
        MAIL_QUEUE_NAME: Joi.string().default('cybervestigio-mail'),
        WAF_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
        MINIO_ENDPOINT: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://localhost:9000'),
        MINIO_PUBLIC_URL: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://localhost:9000'),
        MINIO_REGION: Joi.string().default('us-east-1'),
        MINIO_ACCESS_KEY: Joi.string().default('minioadmin'),
        MINIO_SECRET_KEY: Joi.string().default('minioadmin'),
        MINIO_BUCKET: Joi.string().default('cybervestigio-drive'),
        PORTAL_DEFAULT_SERVICE_PRICE: Joi.number().positive().default(250000),
        PAYMENT_NEQUI_ACCOUNT: Joi.string().default('3000000000'),
        PAYMENT_DAVIPLATA_ACCOUNT: Joi.string().default('3000000001'),
        PAYMENT_TRANSFER_ACCOUNT: Joi.string().default('Cuenta empresarial CyberVestigio'),
        PAYMENT_PSE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).default('https://www.pse.com.co/'),
      }),
    }),
    MailModule,
    StorageModule,
    PrismaModule,
    AuthModule,
    PortalAuthModule,
    PortalModule,
    SiteModule,
    ContactsModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule {}
