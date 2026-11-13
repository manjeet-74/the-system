// Scheduled jobs (weekly-boss, github-verify, daily-reminder) are triggered by pg_cron,
// not by users. The Supabase gateway only checks that *a* valid JWT is present, and the
// anon key is public — so without this check anyone could trigger reminder emails.
// pg_cron sends the secret in the x-cron-secret header; it is set with
// `supabase secrets set CRON_SECRET=...`. Fails closed if the secret is not configured.
export function requireCronSecret(req: Request): Response | null {
  const expected = Deno.env.get('CRON_SECRET');
  const given = req.headers.get('x-cron-secret');
  if (!expected || !given || given !== expected) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

// Non-throwing variant: true when the request carries the cron secret.
export function hasCronSecret(req: Request): boolean {
  const expected = Deno.env.get('CRON_SECRET');
  const given = req.headers.get('x-cron-secret');
  return !!expected && !!given && given === expected;
}
