import dotenv from 'dotenv';
import { QueueEvents, Worker } from 'bullmq';
import nodemailer from 'nodemailer';

dotenv.config();

type MailQueueMessage = {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  errorLabel?: string;
};

type MailerConfig = {
  redisUrl: string;
  queueName: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    from: string;
  };
};

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return value.trim().toLowerCase() === 'true';
}

function getRedisConnection(redisUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(redisUrl);
  } catch {
    throw new Error('REDIS_URL no tiene un formato valido.');
  }

  if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
    throw new Error('REDIS_URL debe usar redis:// o rediss://.');
  }

  const db = parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : undefined;
  if (db !== undefined && Number.isNaN(db)) {
    throw new Error('REDIS_URL debe incluir una base numerica valida cuando usa /db.');
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

function loadConfig(): MailerConfig {
  const redisUrl = process.env.REDIS_URL?.trim() || 'redis://localhost:6379';
  const queueName = process.env.MAIL_QUEUE_NAME?.trim() || 'cybervestigio-mail';
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = parseBoolean(process.env.SMTP_SECURE, false);

  if (!host || !from) {
    throw new Error('SMTP_HOST y SMTP_FROM son obligatorios para iniciar el microservicio de correo.');
  }

  if ((user && !pass) || (!user && pass)) {
    throw new Error('SMTP_USER y SMTP_PASS deben configurarse juntos para autenticar el microservicio de correo.');
  }

  if (Number.isNaN(port) || port <= 0) {
    throw new Error('SMTP_PORT debe ser un numero valido.');
  }

  return {
    redisUrl,
    queueName,
    smtp: {
      host,
      port,
      secure,
      user: user || undefined,
      pass: pass || undefined,
      from,
    },
  };
}

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const connection = getRedisConnection(config.redisUrl);
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user && config.smtp.pass ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });

  await transporter.verify();

  const worker = new Worker<MailQueueMessage>(
    config.queueName,
    async (job) => {
      const message = job.data;
      await transporter.sendMail({
        ...message,
        from: message.from ?? config.smtp.from,
      });
    },
    {
      connection,
      concurrency: 5,
    },
  );

  const queueEvents = new QueueEvents(config.queueName, { connection });

  worker.on('completed', (job) => {
    console.info(`[mailer] Job completado: ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    const label = job?.data.errorLabel || 'correo';
    console.error(`[mailer] Error enviando ${label} en job ${job?.id ?? 'sin-id'}: ${error.message}`);
  });

  worker.on('error', (error) => {
    console.error(`[mailer] Error general del worker: ${error.message}`);
  });

  queueEvents.on('error', (error) => {
    console.error(`[mailer] Error en eventos de cola: ${error.message}`);
  });

  await worker.waitUntilReady();
  await queueEvents.waitUntilReady();

  console.info(`[mailer] Worker escuchando la cola ${config.queueName} en ${config.redisUrl}`);

  const shutdown = async (signal: string) => {
    console.info(`[mailer] Recibida señal ${signal}. Cerrando worker...`);
    await Promise.allSettled([worker.close(), queueEvents.close()]);
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void bootstrap().catch((error) => {
  console.error(`[mailer] No fue posible iniciar el microservicio de correo: ${(error as Error).message}`);
  process.exit(1);
});