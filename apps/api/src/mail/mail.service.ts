import { BadRequestException, Injectable, InternalServerErrorException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

type MailQueueMessage = {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
};

type MailQueueJob = MailQueueMessage & {
  errorLabel: string;
};

@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly queue: Queue<MailQueueJob>;

  constructor(private readonly configService: ConfigService) {
    this.queue = new Queue<MailQueueJob>(this.getQueueName(), {
      connection: this.getRedisConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    });
  }

  private getQueueName(): string {
    return this.configService.get<string>('MAIL_QUEUE_NAME')?.trim() || 'cybervestigio-mail';
  }

  private getRedisConnection() {
    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim() || 'redis://localhost:6379';

    let parsed: URL;
    try {
      parsed = new URL(redisUrl);
    } catch {
      throw new BadRequestException('REDIS_URL no tiene un formato valido para la cola de correos.');
    }

    if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
      throw new BadRequestException('REDIS_URL debe usar el esquema redis:// o rediss://.');
    }

    const db = parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : undefined;
    if (db !== undefined && Number.isNaN(db)) {
      throw new BadRequestException('REDIS_URL debe incluir una base numerica valida cuando usa /db.');
    }

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      db,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  }

  async send(message: MailQueueMessage, errorLabel = 'correo'): Promise<void> {
    const recipients = Array.isArray(message.to)
      ? message.to.map((value) => value.trim()).filter(Boolean)
      : [message.to.trim()].filter(Boolean);
    const subject = message.subject.trim();
    const text = message.text?.trim();
    const html = message.html?.trim();

    if (recipients.length === 0) {
      throw new BadRequestException('Debe indicar al menos un destinatario para encolar el correo.');
    }

    if (!subject) {
      throw new BadRequestException('El asunto del correo es obligatorio para encolar el mensaje.');
    }

    if (!text && !html) {
      throw new BadRequestException('El correo debe incluir contenido en texto o HTML antes de encolarse.');
    }

    try {
      await this.queue.add('send-mail', {
        ...message,
        to: Array.isArray(message.to) ? recipients : recipients[0],
        subject,
        text,
        html,
        errorLabel,
      });
    } catch (error) {
      throw new InternalServerErrorException(`No fue posible encolar el ${errorLabel}. ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}