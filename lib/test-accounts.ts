// Internal test accounts — treated as Pro with unlimited credits everywhere
// (AI generation, watermark-free exports). Extend via TEST_EMAILS env
// (comma-separated) without a deploy.
const TEST_EMAILS = [
  'deynilabjo@gmail.com',
];

export function isTestAccount(email?: string | null) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const fromEnv = (process.env.TEST_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return TEST_EMAILS.includes(normalized) || fromEnv.includes(normalized);
}

export function withTestOverride<T extends { isPro: boolean; plan: string; credits: number }>(
  entitlement: T,
  email?: string | null
): T {
  if (!isTestAccount(email)) return entitlement;
  return { ...entitlement, isPro: true, plan: 'pro', credits: Math.max(entitlement.credits, 9999) };
}
