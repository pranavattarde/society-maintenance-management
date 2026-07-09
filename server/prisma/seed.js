require('dotenv').config({ path: '../.env' });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { BCRYPT_SALT_ROUNDS } = require('../src/utils/constants');

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin@123', BCRYPT_SALT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@society.com' },
    update: {},
    create: {
      name: 'Society Admin',
      email: 'admin@society.com',
      password: adminPassword,
      role: 'ADMIN',
      flatNumber: 'OFFICE',
    },
  });

  const residentPassword = await bcrypt.hash('resident@123', BCRYPT_SALT_ROUNDS);
  const resident = await prisma.user.upsert({
    where: { email: 'resident@society.com' },
    update: {},
    create: {
      name: 'Test Resident',
      email: 'resident@society.com',
      password: residentPassword,
      role: 'RESIDENT',
      flatNumber: 'A-101',
      phone: '9876543210',
    },
  });

  console.log('Seed complete.');
  console.log(`  Admin:    ${admin.email}    / admin@123`);
  console.log(`  Resident: ${resident.email} / resident@123`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
