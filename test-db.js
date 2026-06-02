const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.systemConfig.findMany().then(res => { console.log(res); process.exit(0); });
