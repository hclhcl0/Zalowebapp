const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const article = await prisma.article.findFirst({ where: { title: { contains: 'vắc xin' } } });
  if (article) {
    console.log(JSON.stringify(article.content, null, 2).slice(0, 5000));
  } else {
    console.log('Article not found');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
