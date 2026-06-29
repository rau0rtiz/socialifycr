import { supabase } from '@/integrations/supabase/client';

/**
 * Detects Supabase "JWT expired" errors (PostgREST returns code PGRST301 / message "JWT expired").
 */
const isJwtExpiredError = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || err.error_description || '').toString().toLowerCase();
  const code = (err.code || '').toString();
  return (
    msg.includes('jwt expired') ||
    msg.includes('jwt is expired') ||
    code === 'PGRST301' ||
    code === '401'
  );
};

/**
 * Run a Supabase call. If it fails because the JWT expired, refresh the session
 * once and retry. Use for any mutation that may run on a long-lived tab.
 */
export const withFreshAuth = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    const result = await fn();
    // Many supabase calls return { error } instead of throwing.
    const maybeError = (result as any)?.error;
    if (maybeError && isJwtExpiredError(maybeError)) {
      await supabase.auth.refreshSession();
      return await fn();
    }
    return result;
  } catch (err) {
    if (isJwtExpiredError(err)) {
      await supabase.auth.refreshSession();
      return await fn();
    }
    throw err;
  }
};
