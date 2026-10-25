import { env } from '../../config/env.js';
import { MockPaymentProvider } from './providers/mock.provider.js';

// Provider Registry
const providers = {
  mock: new MockPaymentProvider(),
};

/**
 * Payment Provider Factory
 * Returns the configured payment provider (defaults to MockPaymentProvider)
 * To plug in a real gateway (e.g. Razorpay, Stripe), implement BasePaymentProvider and register here.
 */
export const getPaymentProvider = (providerName = env.paymentProvider || 'mock') => {
  const normalized = (providerName || 'mock').toLowerCase();
  const provider = providers[normalized];

  if (!provider) {
    throw new Error(
      `Unsupported payment provider "${providerName}". Supported providers: ${Object.keys(providers).join(', ')}`
    );
  }

  return provider;
};

export default getPaymentProvider;
