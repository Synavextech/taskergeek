module.exports = {
  apps: [{
    name: 'promtasker',
    script: 'dist/index.mjs',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      // Use string references - PM2 will resolve these automatically
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',
      PRODUCTION_URL: process.env.PRODUCTION_URL || '',
      PAYPAL_WEBHOOK_SECRET: process.env.PAYPAL_WEBHOOK_SECRET || ''
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
