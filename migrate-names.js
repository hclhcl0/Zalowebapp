const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function newNormalizeName(n) {
  return String(n || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

async function main() {
  const links = await prisma.staffZaloLink.findMany();
  for (const link of links) {
    const updatedName = newNormalizeName(link.staffNameRaw);
    try {
      await prisma.staffZaloLink.update({
        where: { id: link.id },
        data: { staffName: updatedName }
      });
      console.log(`Updated ID ${link.id}: ${link.staffName} -> ${updatedName}`);
    } catch (err) {
      console.error(`Failed to update ID ${link.id}:`, err.message);
    }
  }
}

main().finally(() => prisma.$disconnect());
