/**
 * The payment channels an invoice can be locked to.
 *
 * Mayar reports the channels a merchant has enabled as `{ type, code }` pairs
 * on `GET /payment-channels`, while `POST /invoices/create` accepts a different
 * `paymentMethod` string. No endpoint publishes the mapping between the two, so
 * it is written out here and has to be edited by hand when Mayar adds a
 * channel. See ADR-0016.
 *
 * Every value below was created against the sandbox and checked, rather than
 * copied from the documentation. Four values on the documented list did not
 * survive that check and are absent:
 *
 * - `ewallet/jenius` is refused. The value that works is `ewallet/jeniuspay`.
 * - `outlet/alfamart` is refused outright, and so is `alfamart`.
 * - `retail/alfamart` and `retail/indomaret` are accepted, then fail to
 *   prepare: `field 'payment_method.over_the_counter' is required`. No request
 *   field can supply it, so a retail outlet cannot be locked at all.
 * - `ewallet/gopay` is accepted, then fails to prepare:
 *   `channel_properties.failure_return_url is mandatory`. Invoice create takes
 *   no such field. Restore GoPay when Mayar sends it.
 *
 * This module holds no secrets and is safe in the client bundle.
 */

export const PAYMENT_METHODS = [
  "ewallet/dana",
  "ewallet/jeniuspay",
  "ewallet/linkaja",
  "ewallet/shopeepay",
  "qris",
  "va/bjb",
  "va/bni",
  "va/bri",
  "va/bsi",
  "va/cimb",
  "va/mandiri",
  "va/permata",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentChannelGroup = "ewallet" | "qris" | "va";

export type PaymentChannel = {
  /** The `code` Mayar reports for this channel. */
  code: string;
  group: PaymentChannelGroup;
  label: string;
  /** Jenius is the only channel that needs a second field from the buyer. */
  needsCashtag: boolean;
  paymentMethod: PaymentMethod;
  /** The `type` Mayar reports for this channel. */
  type: string;
};

export const PAYMENT_CHANNELS: readonly PaymentChannel[] = [
  {
    code: "QRIS",
    group: "qris",
    label: "QRIS",
    needsCashtag: false,
    paymentMethod: "qris",
    type: "qris",
  },
  {
    code: "BNI",
    group: "va",
    label: "BNI",
    needsCashtag: false,
    paymentMethod: "va/bni",
    type: "va",
  },
  {
    code: "BRI",
    group: "va",
    label: "BRI",
    needsCashtag: false,
    paymentMethod: "va/bri",
    type: "va",
  },
  {
    code: "MANDIRI",
    group: "va",
    label: "Mandiri",
    needsCashtag: false,
    paymentMethod: "va/mandiri",
    type: "va",
  },
  {
    code: "BSI",
    group: "va",
    label: "BSI",
    needsCashtag: false,
    paymentMethod: "va/bsi",
    type: "va",
  },
  {
    code: "BJB",
    group: "va",
    label: "BJB",
    needsCashtag: false,
    paymentMethod: "va/bjb",
    type: "va",
  },
  {
    code: "CIMB",
    group: "va",
    label: "CIMB Niaga",
    needsCashtag: false,
    paymentMethod: "va/cimb",
    type: "va",
  },
  {
    code: "PERMATA",
    group: "va",
    label: "Permata",
    needsCashtag: false,
    paymentMethod: "va/permata",
    type: "va",
  },
  {
    code: "DANA",
    group: "ewallet",
    label: "DANA",
    needsCashtag: false,
    paymentMethod: "ewallet/dana",
    type: "ewallet",
  },
  {
    code: "LINKAJA",
    group: "ewallet",
    label: "LinkAja",
    needsCashtag: false,
    paymentMethod: "ewallet/linkaja",
    type: "ewallet",
  },
  {
    code: "SHOPEEPAY",
    group: "ewallet",
    label: "ShopeePay",
    needsCashtag: false,
    paymentMethod: "ewallet/shopeepay",
    type: "ewallet",
  },
  {
    // The documented enum lists `ewallet/jenius`, and that value is refused
    // with "Payment method is not available or disabled". The value the API
    // accepts is `ewallet/jeniuspay`, which is what the cashtag note on the
    // same page uses. Sandbox-verified. See ADR-0016.
    code: "JENIUSPAY",
    group: "ewallet",
    label: "Jenius",
    needsCashtag: true,
    paymentMethod: "ewallet/jeniuspay",
    type: "ewallet",
  },
];

export const PAYMENT_CHANNEL_GROUPS: ReadonlyArray<{
  group: PaymentChannelGroup;
  label: string;
}> = [
  { group: "qris", label: "QRIS" },
  { group: "va", label: "Bank transfer" },
  { group: "ewallet", label: "E-wallet" },
];

/**
 * Finds the channel behind a reported `{ type, code }` pair.
 *
 * The lookup needs both halves, not the code alone: Mayar reports a virtual
 * account and a retail channel that share the code `BRI`, and matching on the
 * code would map BRILink onto a BRI virtual account.
 */
export function findPaymentChannel(type: string, code: string | null) {
  if (!code) {
    return;
  }

  const wantedType = type.toLowerCase();
  const wantedCode = code.toUpperCase();

  return PAYMENT_CHANNELS.find(
    (channel) =>
      channel.type === wantedType && channel.code.toUpperCase() === wantedCode
  );
}

export function findPaymentChannelByMethod(method: string) {
  return PAYMENT_CHANNELS.find((channel) => channel.paymentMethod === method);
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === "string" &&
    PAYMENT_METHODS.includes(value as PaymentMethod)
  );
}
