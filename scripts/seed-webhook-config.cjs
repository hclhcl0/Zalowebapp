const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const configs = [
    {
      key: 'payload_webhook_secret',
      value: 'cdc-webhook-secret-2025',
      label: 'Webhook Secret từ Payload CMS',
    },
    {
      key: 'payload_cms_url',
      value: 'https://ecdc.vnos.org',
      label: 'URL gốc Payload CMS',
    },
    {
      key: 'payload_article_url_pattern',
      value: 'https://ecdc.vnos.org/bai-viet/{slug}',
      label: 'URL pattern bài viết CMS',
    },
  ];

  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value, label: cfg.label },
      create: { key: cfg.key, value: cfg.value, label: cfg.label },
    });
    console.log('Upserted:', cfg.key, '=', cfg.value);
  }

  console.log('\nDone! Da upsert 3 config keys.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
