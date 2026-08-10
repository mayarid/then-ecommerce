import { z } from "zod";

import type { JsonObject } from "@/db/schema";
import type { PaymentMethod } from "@/lib/payment-channels";
import { getRuntimeEnv, requireEnv } from "@/lib/runtime-env";

const invoiceResponseSchema = z.object({
  expiredAt: z.union([z.number(), z.string()]),
  id: z.string(),
  link: z.url(),
  // Undocumented, and present on a channel-locked invoice. It is read only to
  // find a failure Mayar reports inside a 200 response. Nothing else depends on
  // it, so Mayar dropping the field costs nothing. See ADR-0016.
  paymentDetail: z
    .object({
      errorMessage: z.string().nullish(),
      // A prepared channel reports a word such as `PENDING` or `ACTIVE`. A
      // channel that could not be prepared reports an HTTP status number.
      status: z.union([z.number(), z.string()]).nullish(),
    })
    .loose()
    .nullish(),
  transactionId: z.string(),
});

// Only the fields this application reads. Mayar sends more, and the rest is
// merchant configuration that the checkout has no use for.
const paymentChannelsResponseSchema = z.object({
  config: z.array(
    z.object({
      code: z.string().nullish(),
      name: z.string(),
      status: z.boolean(),
      type: z.string(),
    })
  ),
});

const transactionResponseSchema = z.object({
  amount: z.number(),
  extraData: z.unknown().optional().nullable(),
  id: z.string(),
  status: z.string(),
});

type InvoiceInput = {
  /** Required by `POST /invoices/create` when `paymentMethod` is Jenius. */
  cashtag?: string;
  description: string;
  email: string;
  expiredAt: string;
  extraData: Record<string, string>;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
  }>;
  mobile: string;
  name: string;
  /**
   * Restricts the invoice to one channel, so the hosted page offers only what
   * the buyer already chose. Documented on `POST /invoices/create`. A channel
   * the merchant has disabled returns 400.
   */
  paymentMethod?: PaymentMethod;
  /**
   * Post-payment browser return URL. Official V1 docs document this field.
   * Sandbox-verified on V2 create: accepted and persisted on the invoice.
   */
  redirectUrl?: string;
};

export type MayarWebhook = {
  amount: number | null;
  eventType: string;
  id: string;
  payload: JsonObject;
  status: string | boolean | null;
  transactionId: string | null;
};

function apiBaseUrl() {
  return getRuntimeEnv().MAYAR_ENVIRONMENT === "production"
    ? "https://api.mayar.id/hl/v2"
    : "https://api.mayar.io/hl/v2";
}

async function requestMayar<T>(
  path: string,
  init?: RequestInit,
  parse?: (value: unknown) => T
) {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireEnv("MAYAR_API_KEY")}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = "Mayar request failed";

    try {
      const body = (await response.json()) as {
        message?: string;
        messages?: string;
      };
      message = body.messages ?? body.message ?? message;
    } catch {
      // Keep the status-based error when Mayar returns a non-JSON response.
    }

    throw new Error(`${message} (${response.status})`);
  }

  const body = (await response.json()) as {
    data?: unknown;
    message?: string;
    messages?: string;
    statusCode?: number;
  };

  if (body.statusCode !== undefined && body.statusCode >= 400) {
    const message = body.messages ?? body.message ?? "Mayar request failed";

    throw new Error(`${message} (${response.status})`);
  }

  return parse ? parse(body.data) : (body.data as T);
}

/**
 * Rejects an invoice Mayar reports as failed inside a successful response.
 *
 * A channel-locked invoice can come back `200 success` while `paymentDetail`
 * carries its own status and error, for instance when Jenius is asked for
 * without a cashtag. Treating that as a success would hand the buyer a link
 * that cannot take money, with their stock already reserved behind it.
 * Sandbox-verified. See ADR-0016.
 */
function assertInvoiceUsable(
  invoice: z.infer<typeof invoiceResponseSchema>
): z.infer<typeof invoiceResponseSchema> {
  const detail = invoice.paymentDetail;

  if (detail && typeof detail.status === "number" && detail.status >= 400) {
    throw new Error(
      detail.errorMessage ?? "Mayar could not prepare that payment method"
    );
  }

  return invoice;
}

export function createMayarInvoice(input: InvoiceInput) {
  return requestMayar(
    "/invoices/create",
    {
      body: JSON.stringify(input),
      method: "POST",
    },
    (value) => assertInvoiceUsable(invoiceResponseSchema.parse(value))
  );
}

/** The merchant's channel configuration. See `GET /payment-channels`. */
export function getMayarPaymentChannels() {
  return requestMayar("/payment-channels", undefined, (value) =>
    paymentChannelsResponseSchema.parse(value)
  );
}

export function getMayarTransaction(transactionId: string) {
  return requestMayar(
    `/transactions/${encodeURIComponent(transactionId)}`,
    undefined,
    (value) => transactionResponseSchema.parse(value)
  );
}

export function createMayarVerificationPayload(
  eventId: string,
  transaction: { amount: number; id: string; status: string }
) {
  return {
    data: {
      amount: transaction.amount,
      status: transaction.status,
      transactionId: transaction.id,
    },
    eventType: "payment.received",
    id: eventId,
  };
}

function record(value: unknown): JsonObject {
  return typeof value === "object" && value !== null
    ? (value as JsonObject)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

export function parseMayarWebhook(payload: unknown): MayarWebhook {
  const root = record(payload);
  const data = record(root.data);
  const event = record(root.event);
  const eventType =
    stringValue(root.eventType) ??
    stringValue(root.event) ??
    stringValue(root.type) ??
    stringValue(event.received) ??
    stringValue(event.type) ??
    "unknown";
  const transactionStatus = data.transactionStatus ?? data.status;

  return {
    amount: typeof data.amount === "number" ? data.amount : null,
    eventType,
    id: stringValue(data.id) ?? stringValue(root.id) ?? crypto.randomUUID(),
    payload: root,
    status:
      typeof transactionStatus === "boolean" ||
      typeof transactionStatus === "string"
        ? transactionStatus
        : null,
    transactionId:
      stringValue(data.transactionId) ??
      stringValue(data.transaction_id) ??
      stringValue(data.id),
  };
}

export function isMayarPaid(status: string | boolean | null) {
  return status === true || status === "paid" || status === "PAID";
}
