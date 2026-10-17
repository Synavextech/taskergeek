const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'PORT',
  'PRODUCTION_URL',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET'
];

const optional = [
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'ADMIN_NAME'
];

export function validateEnvironment(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check optional but recommended variables
  for (const key of optional) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  // For development, also check VITE variables
  if (process.env.NODE_ENV === 'development') {
    const viteRequired = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_PAYPAL_CLIENT_ID'];
    for (const key of viteRequired) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }

  // Report results
  if (missing.length > 0) {
    console.error(' Missing required environment variables:');
    missing.forEach(key => {
      console.error(`  - ${key}`);
    });
    console.error('\n Add these to your .env file or set them as environment variables.');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('Optional environment variables not set:');
    warnings.forEach(key => {
      console.warn(`  - ${key}`);
    });
    console.warn('These are not required but recommended for full functionality.\n');
  }

  console.log('Environment variable check passed');
}

// Validate specific Supabase configuration
export function validateSupabaseConfig(): void {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !serviceKey || !anonKey) {
    console.error('Incomplete Supabase configuration');
    process.exit(1);
  }

  // Basic URL format validation
  if (!url.startsWith('https://') || !url.includes('supabase.co')) {
    console.warn('SUPABASE_URL format looks unusual. Expected format: https://xxx.supabase.co');
  }

  // Basic key format validation
  if (!serviceKey.startsWith('eyJ') || serviceKey.length < 100) {
    console.warn(' SUPABASE_SERVICE_ROLE_KEY format looks unusual');
  }

  if (!anonKey.startsWith('eyJ') || anonKey.length < 100) {
    console.warn(' SUPABASE_ANON_KEY format looks unusual');
  }
}
export function validatePayPalConfig(): void {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !secret) {
    console.warn(' PayPal configuration incomplete. Payment features will be disabled.');
    return;
  }

  // Basic format checks
  if (clientId.length < 10) {
    console.warn('PAYPAL_CLIENT_ID format looks unusual');
  }

  if (secret.length < 10) {
    console.warn(' PAYPAL_CLIENT_SECRET format looks unusual');
  }

  console.log('PayPal configuration validated');
}