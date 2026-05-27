import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { BILLING_SERVICES_CATALOG } from './billing-services.catalog';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? '',
});
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const adminEmail = (process.env.ADMIN_INITIAL_EMAIL ?? 'admin@cybervestigio.co').toLowerCase();
  const adminName = process.env.ADMIN_INITIAL_NAME ?? 'Administrador CyberVestigio';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD ?? 'Cambiar-Esta-Clave-123!';
  const passwordHash = await hash(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { name: adminName, passwordHash, role: 'ADMIN' },
    create: { name: adminName, email: adminEmail, passwordHash, role: 'ADMIN' },
  });

  await prisma.siteSetting.upsert({
    where: { id: 'main' },
    update: {},
    create: {
      id: 'main',
      companyName: 'CyberVestigio',
      heroTitle: 'El vestigio digital que convierte los hechos en evidencia técnica.',
      heroDescription:
        'Investigación ciberforense con preservación, análisis e informes claros para organizaciones, abogados y personas que necesitan sustentar un caso digital.',
      contactEmail: 'contacto@cybervestigio.co',
      contactPhone: '+57 300 000 0000',
      location: 'Colombia',
    },
  });

  const services = [
    {
      slug: 'informatica-forense',
      title: 'Informática forense',
      description:
        'Adquisición, preservación y análisis técnico de evidencia digital en equipos y medios de almacenamiento autorizados.',
      icon: 'hard-drive',
      sortOrder: 1,
    },
    {
      slug: 'investigacion-incidentes',
      title: 'Investigación de incidentes',
      description:
        'Reconstrucción técnica de accesos, alteraciones, borrados y posibles vectores de compromiso digital.',
      icon: 'search',
      sortOrder: 2,
    },
    {
      slug: 'cadena-custodia',
      title: 'Cadena de custodia',
      description:
        'Identificación, trazabilidad y documentación controlada del elemento material probatorio digital.',
      icon: 'file-check',
      sortOrder: 3,
    },
    {
      slug: 'evidencia-movil-nube',
      title: 'Evidencia móvil y nube',
      description:
        'Orientación para preservar información relevante de dispositivos móviles, cuentas y respaldos autorizados.',
      icon: 'smartphone',
      sortOrder: 4,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
  }

  // Seed configurable billing services used by the factura module.
  for (const [index, item] of BILLING_SERVICES_CATALOG.entries()) {
    const existing = await prisma.billingService.findFirst({
      where: {
        sector: item.sector,
        service: item.service,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.billingService.update({
        where: { id: existing.id },
        data: {
          scope: item.scope,
          recommendedPrice: item.recommendedPrice,
          priceNote: item.priceNote ?? null,
          active: true,
          sortOrder: index + 1,
        },
      });
      continue;
    }

    await prisma.billingService.create({
      data: {
        sector: item.sector,
        service: item.service,
        scope: item.scope,
        recommendedPrice: item.recommendedPrice,
        priceNote: item.priceNote ?? null,
        active: true,
        sortOrder: index + 1,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.info('Semilla de CyberVestigio cargada correctamente.');
  })
  .catch(async (error: unknown) => {
    console.error('No fue posible cargar la semilla.', error);
    await prisma.$disconnect();
    process.exit(1);
  });
