const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const gemini = await prisma.geminiApiKey.findMany({ where: { isActive: true } });
  const groq = await prisma.groqApiKey.findMany({ where: { isActive: true } });
  console.log("=== GEMINI KEYS ===", gemini.length, "keys");
  gemini.forEach((k, i) => console.log(`  ${i+1}. ...${k.apiKey.slice(-8)}`));
  console.log("=== GROQ KEYS ===", groq.length, "keys");
  groq.forEach((k, i) => console.log(`  ${i+1}. ...${k.apiKey.slice(-8)}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
