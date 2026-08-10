/**
 * Reads the payment instructions Mayar returns when an invoice is created.
 *
 * `POST /invoices/create` answers a channel-locked invoice with a
 * `paymentDetail` object carrying the real instructions: a virtual account
 * number, a QRIS payload, or an e-wallet deeplink. The field appears on no
 * endpoint page, and `GET /invoices/{id}` does not return it, so it has to be
 * read and stored the one time it is offered. See ADR-0017.
 *
 * Everything here is defensive. An unrecognised shape returns null, and the
 * order page falls back to the hosted payment link, so Mayar changing or
 * dropping the field costs a nicer screen and nothing else.
 */

export type PaymentInstruction =
  | {
      accountName: string | null;
      bank: string;
      expiresAt: string | null;
      kind: "virtual_account";
      number: string;
    }
  | {
      expiresAt: string | null;
      kind: "qris";
      qrString: string;
    }
  | {
      deeplinkUrl: string | null;
      kind: "ewallet";
      provider: string | null;
      qrString: string | null;
    };

// EMVCo payload format indicator. Every real QRIS string starts with it.
// The sandbox answers with words such as `some-random-qr-string`, which would
// otherwise be encoded into a QR that scans to nonsense.
const EMVCO_PREFIX = /^000201/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** True when a string is a QRIS payload rather than a sandbox placeholder. */
export function isRenderableQrString(value: unknown): value is string {
  const text = asString(value);

  return text !== null && EMVCO_PREFIX.test(text);
}

function readVirtualAccount(detail: Record<string, unknown>) {
  const account = asRecord(detail.virtual_account);

  if (!account) {
    return null;
  }

  const properties = asRecord(account.channel_properties) ?? {};
  const number = asString(properties.virtual_account_number);
  const bank = asString(account.channel_code);

  if (!(number && bank)) {
    return null;
  }

  return {
    accountName: asString(properties.customer_name),
    bank,
    expiresAt: asString(properties.expires_at),
    kind: "virtual_account" as const,
    number,
  };
}

function readQris(detail: Record<string, unknown>) {
  const code = asRecord(detail.qr_code);

  if (!code) {
    return null;
  }

  const properties = asRecord(code.channel_properties) ?? {};
  const qrString = properties.qr_string;

  // A placeholder is treated as no instruction at all. Drawing it would give
  // the buyer a QR that cannot be paid, which is worse than the hosted page.
  if (!isRenderableQrString(qrString)) {
    return null;
  }

  return {
    expiresAt: asString(properties.expires_at),
    kind: "qris" as const,
    qrString,
  };
}

function readEwallet(detail: Record<string, unknown>) {
  const wallet = asRecord(detail.ewallet);
  const actions = Array.isArray(detail.actions) ? detail.actions : [];
  let deeplinkUrl: string | null = null;
  let qrString: string | null = null;

  for (const entry of actions) {
    const action = asRecord(entry);

    if (!action) {
      continue;
    }

    if (action.action === "AUTH") {
      deeplinkUrl = asString(action.url);
    }

    if (action.action === "PRESENT_TO_CUSTOMER" && !qrString) {
      qrString = isRenderableQrString(action.qr_code) ? action.qr_code : null;
    }
  }

  if (!(deeplinkUrl || qrString)) {
    return null;
  }

  return {
    deeplinkUrl,
    kind: "ewallet" as const,
    provider: wallet ? asString(wallet.channel_code) : null,
    qrString,
  };
}

/**
 * Turns Mayar's `paymentDetail` into something the order page can render.
 *
 * Returns null when the channel offers nothing to show, which is the case for
 * a retail outlet such as Alfamart, and whenever the shape is not recognised.
 */
export function parsePaymentInstruction(
  paymentDetail: unknown
): PaymentInstruction | null {
  const detail = asRecord(paymentDetail);

  if (!detail) {
    return null;
  }

  // A failed channel reports an HTTP status here. It has no instructions.
  if (typeof detail.status === "number" && detail.status >= 400) {
    return null;
  }

  return readVirtualAccount(detail) ?? readQris(detail) ?? readEwallet(detail);
}
