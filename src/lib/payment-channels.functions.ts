import { createServerFn } from "@tanstack/react-start";

import { getMayarPaymentChannels } from "@/lib/mayar";
import {
  findPaymentChannel,
  findPaymentChannelByMethod,
  isPaymentMethod,
  type PaymentChannel,
  type PaymentMethod,
} from "@/lib/payment-channels";
import { readSetupValue, writeSetupValue } from "@/lib/setup-metadata";

export const PAYMENT_CHANNELS_KEY = "mayar_payment_channels";

// Mayar allows 50 requests per minute for the whole API key, and checkout
// spends that budget on creating invoices. Asking for the channel list on every
// checkout view would compete with the requests that actually take money, so
// the answer is cached. A channel switched on in the Mayar dashboard shows up
// here within this window.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CachedChannels = {
  fetchedAt: string;
  methods: string;
};

function readCache(value: unknown): CachedChannels | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const { fetchedAt, methods } = value as Record<string, unknown>;

  return typeof fetchedAt === "string" && typeof methods === "string"
    ? { fetchedAt, methods }
    : null;
}

function parseMethods(cached: CachedChannels) {
  return cached.methods.split(",").filter(isPaymentMethod);
}

function isFresh(cached: CachedChannels, now: number) {
  const fetchedAt = Date.parse(cached.fetchedAt);

  return Number.isFinite(fetchedAt) && now - fetchedAt < CACHE_TTL_MS;
}

async function fetchEnabledMethods() {
  const { config } = await getMayarPaymentChannels();
  const methods: PaymentMethod[] = [];

  for (const entry of config) {
    if (!entry.status) {
      continue;
    }

    const channel = findPaymentChannel(entry.type, entry.code ?? null);

    // A channel with no `paymentMethod` value cannot be locked, so offering it
    // would send the buyer to a page listing every other channel too. The
    // decision to hide those is recorded in ADR-0016.
    if (channel) {
      methods.push(channel.paymentMethod);
    }
  }

  return methods;
}

/**
 * The payment methods this store may lock an invoice to right now.
 *
 * A live answer is preferred. A stale cached answer is served when Mayar is
 * unreachable, because a checkout that offers a slightly old list still ends in
 * a real invoice, and Mayar rejects a channel it has since disabled. With
 * neither, the call throws and the caller decides.
 */
export async function listEnabledPaymentMethods(): Promise<PaymentMethod[]> {
  const now = Date.now();
  const cached = readCache(await readSetupValue(PAYMENT_CHANNELS_KEY));

  if (cached && isFresh(cached, now)) {
    return parseMethods(cached);
  }

  try {
    const methods = await fetchEnabledMethods();

    await writeSetupValue(PAYMENT_CHANNELS_KEY, {
      fetchedAt: new Date(now).toISOString(),
      methods: methods.join(","),
    });

    return methods;
  } catch (error) {
    if (cached) {
      console.error("Falling back to the cached Mayar channel list", error);

      return parseMethods(cached);
    }

    throw error;
  }
}

/**
 * Refuses a channel the merchant has not enabled.
 *
 * This runs before checkout writes anything, so a rejected channel never
 * reserves stock. The list is server-owned; the value from the browser is only
 * ever a candidate.
 */
export async function assertPaymentMethodEnabled(method: PaymentMethod) {
  const enabled = await listEnabledPaymentMethods();

  if (!enabled.includes(method)) {
    throw new Error("That payment method is not available. Choose another one");
  }
}

export const getPaymentChannelOptions = createServerFn({
  method: "GET",
}).handler(async (): Promise<PaymentChannel[]> => {
  const enabled = await listEnabledPaymentMethods();

  return enabled
    .map((method) => findPaymentChannelByMethod(method))
    .filter((channel): channel is PaymentChannel => Boolean(channel));
});
