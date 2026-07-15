require('dotenv').config();

const validateEnv = require('./src/config/validateEnv');
validateEnv(); // Verify all required keys are populated before proceeding

const app = require('./app');
const prisma = require('./src/config/db');
const { initScheduler } = require('./src/services/scheduler.service');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('[DB] PostgreSQL connected');

    // Initialize scheduled background tasks
    initScheduler();

    app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
}

startServer();
