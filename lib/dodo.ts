import DodoPayments from 'dodopayments';

export function getDodoClient() {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const webhookKey = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  const environment =
    process.env.DODO_PAYMENTS_ENVIRONMENT === 'test_mode' ? 'test_mode' : 'live_mode';

  if (!bearerToken) {
    throw new Error('Server is missing DODO_PAYMENTS_API_KEY.');
  }

  return new DodoPayments({
    bearerToken,
    webhookKey: webhookKey || null,
    environment,
  });
}

export function getProProductId() {
  const productId = process.env.DODO_PRODUCT_PRO?.trim();
  if (!productId) {
    throw new Error('Server is missing DODO_PRODUCT_PRO.');
  }
  return productId;
}

export function getAppUrl(requestUrl?: string) {
  const configured = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (requestUrl) return new URL(requestUrl).origin;
  return 'http://localhost:3000';
}
