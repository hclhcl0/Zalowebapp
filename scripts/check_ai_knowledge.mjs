import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.aiKnowledge.count();
  console.log(`Total AiKnowledge records in DB: ${count}`);
  
  const sample = await prisma.aiKnowledge.findMany({
    take: 15,
    select: { id: true, title: true, category: true, sourceUrl: true }
  });
  console.log("Sample records:");
  sample.forEach(s => console.log(`- [${s.category}] ${s.title} (${s.sourceUrl || 'no-url'})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
