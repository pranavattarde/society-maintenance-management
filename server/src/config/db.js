const { PrismaClient } = require('@prisma/client');

/**
 * Prisma client singleton.
 *
 * A single shared instance is used across all services to prevent
 * connection pool exhaustion from instantiating multiple clients.
 */
const prisma = new PrismaClient();

module.exports = prisma;
