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
  });

  it("hides a channel the invoice endpoint cannot actually prepare", () => {
    // All sandbox-verified. Each is accepted or listed, and then fails:
    // retail cannot supply `payment_method.over_the_counter`, and GoPay cannot
    // supply `channel_properties.failure_return_url`. Offering either would
    // give the buyer a choice that always breaks at checkout.
    expect(findPaymentChannel("retail", "ALFAMART")).toBeUndefined();
    expect(findPaymentChannel("retail", "INDOMARET")).toBeUndefined();
    expect(findPaymentChannel("ewallet", "GOPAY")).toBeUndefined();
    expect(isPaymentMethod("outlet/alfamart")).toBe(false);
    expect(isPaymentMethod("retail/alfamart")).toBe(false);
    expect(isPaymentMethod("ewallet/gopay")).toBe(false);
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
    expect(findPaymentChannelByMethod("va/permata")?.code).toBe("PERMATA");
    expect(findPaymentChannelByMethod("ewallet/ovo")).toBeUndefined();
  });

  it("offers only channels proved to work against the sandbox", () => {
    expect([...PAYMENT_METHODS].sort()).toEqual([
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
    ]);
  });

  it("recognises only documented payment methods", () => {
    expect(isPaymentMethod("qris")).toBe(true);
    expect(isPaymentMethod("ewallet/ovo")).toBe(false);
    expect(isPaymentMethod(undefined)).toBe(false);
  });
});
