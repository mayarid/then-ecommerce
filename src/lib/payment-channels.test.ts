import { describe, expect, it } from "vitest";

import {
  findPaymentChannel,
  findPaymentChannelByMethod,
  isPaymentMethod,
  PAYMENT_CHANNELS,
  PAYMENT_METHODS,
} from "./payment-channels";

describe("payment channel catalogue", () => {
  it("maps every documented payment method exactly once", () => {
    const methods = PAYMENT_CHANNELS.map((channel) => channel.paymentMethod);

    expect(new Set(methods).size).toBe(methods.length);
    expect([...methods].sort()).toEqual([...PAYMENT_METHODS].sort());
  });

  it("keeps a virtual account apart from a retail channel of the same code", () => {
    // Mayar reports both `va:BRI` and `retail:BRI`. Matching on the code alone
    // would turn BRILink into a BRI virtual account.
    expect(findPaymentChannel("va", "BRI")?.paymentMethod).toBe("va/bri");
    expect(findPaymentChannel("retail", "BRI")).toBeUndefined();
  });

  it("hides a channel that no payment method can lock", () => {
    // Enabled on the sandbox account, absent from the invoice enum.
    expect(findPaymentChannel("ewallet", "OVO")).toBeUndefined();
    expect(findPaymentChannel("va", "FLIP")).toBeUndefined();
    expect(findPaymentChannel("va", "other")).toBeUndefined();
    expect(findPaymentChannel("retail", "INDOMARET")).toBeUndefined();
  });

  it("ignores case and a missing code", () => {
    expect(findPaymentChannel("EWALLET", "shopeepay")?.paymentMethod).toBe(
      "ewallet/shopeepay"
    );
    expect(findPaymentChannel("card", null)).toBeUndefined();
  });

  it("asks for a cashtag only for Jenius", () => {
    const needCashtag = PAYMENT_CHANNELS.filter(
      (channel) => channel.needsCashtag
    ).map((channel) => channel.paymentMethod);

    expect(needCashtag).toEqual(["ewallet/jeniuspay"]);
  });

  it("spells Jenius the way the API accepts it, not the way the enum lists it", () => {
    // The documented enum says `ewallet/jenius`, and that value is refused with
    // "Payment method is not available or disabled". Sandbox-verified.
    expect(findPaymentChannel("ewallet", "JENIUSPAY")?.paymentMethod).toBe(
      "ewallet/jeniuspay"
    );
    expect(isPaymentMethod("ewallet/jenius")).toBe(false);
  });

  it("finds a channel back from its payment method", () => {
    expect(findPaymentChannelByMethod("outlet/alfamart")?.code).toBe(
      "ALFAMART"
    );
    expect(findPaymentChannelByMethod("ewallet/ovo")).toBeUndefined();
  });

  it("recognises only documented payment methods", () => {
    expect(isPaymentMethod("qris")).toBe(true);
    expect(isPaymentMethod("ewallet/ovo")).toBe(false);
    expect(isPaymentMethod(undefined)).toBe(false);
  });
});
