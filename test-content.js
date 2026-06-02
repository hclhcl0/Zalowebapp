const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.aiKnowledge.findMany().then(res => { console.log(res[0].content.substring(0, 500)); process.exit(0); });
