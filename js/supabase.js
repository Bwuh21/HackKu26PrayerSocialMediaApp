import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { SUPABASE_URL as defaultUrl, SUPABASE_ANON_KEY as defaultKey } from './config.js';

/**
 * Config merge order:
 * 1. config.js (placeholders, committed)
 * 2. config.deploy.js (generated on Vercel from SUPABASE_URL / SUPABASE_ANON_KEY)
 * 3. config.local.js (optional, gitignored — local dev)
 */
let SUPABASE_URL = defaultUrl;
let SUPABASE_ANON_KEY = defaultKey;

try {
  const deploy = await import('./config.deploy.js');
  if (typeof deploy.SUPABASE_URL === 'string' && deploy.SUPABASE_URL.length > 12) {
    SUPABASE_URL = deploy.SUPABASE_URL;
  }
  if (typeof deploy.SUPABASE_ANON_KEY === 'string' && deploy.SUPABASE_ANON_KEY.length > 20) {
    SUPABASE_ANON_KEY = deploy.SUPABASE_ANON_KEY;
  }
} catch {
  // Normal when config.deploy.js is absent (local dev without running build).
}

try {
  const local = await import('./config.local.js');
  if (typeof local.SUPABASE_URL === 'string') SUPABASE_URL = local.SUPABASE_URL;
  if (typeof local.SUPABASE_ANON_KEY === 'string') SUPABASE_ANON_KEY = local.SUPABASE_ANON_KEY;
} catch {
  // Missing config.local.js is normal.
}

const looksConfigured =
  typeof SUPABASE_URL === 'string' &&
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
  typeof SUPABASE_ANON_KEY === 'string' &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');

export const supabaseConfigured = looksConfigured;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
