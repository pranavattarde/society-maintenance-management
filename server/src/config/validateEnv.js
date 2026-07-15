/**
 * validateEnv.js — Environment variable validation for server bootstrap.
 *
 * Checks all required configuration settings. If any keys are missing,
 * it outputs a list of missing variables and crashes the server startup.
 * This guarantees we fail fast and avoid running in unstable configurations.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'GROQ_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RESEND_API_KEY',
  'FROM_EMAIL',
];

function validateEnv() {
  const missing = [];

  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key] || process.env[key].trim().length === 0) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ FATAL STARTUP ERROR: Missing required environment variables:');
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
    console.error('\nPlease declare these environment variables inside .env file or host environment config to run the application.\n');
    process.exit(1);
  }
}

module.exports = validateEnv;
