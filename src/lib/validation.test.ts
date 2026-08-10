import { describe, expect, it } from "vitest";

import { checkoutSchema, orderLookupSchema } from "./validation";

const validCheckout = {
  addressLine: "Jl. Merdeka No. 1",
  city: "Jakarta Selatan",
  email: "customer@example.com",
  guestName: "Customer",
  lines: [{ productId: "product-1", quantity: 1 }],
  paymentMethod: "qris",
  phone: "081234567890",
  postalCode: "12190",
  province: "DKI Jakarta",
};

describe("checkout validation", () => {
  it("accepts the Indonesia basic shipping shape", () => {
    const result = checkoutSchema.safeParse(validCheckout);

    expect(result.success).toBe(true);
  });

  it("rejects an invalid postal code and empty cart", () => {
    const result = checkoutSchema.safeParse({
      addressLine: "Short",
      city: "Jakarta",
      email: "not-an-email",
      guestName: "",
      lines: [],
      paymentMethod: "qris",
      phone: "123",
      postalCode: "12",
      province: "Jakarta",
    });

    expect(result.success).toBe(false);
  });

  it("requires a payment method", () => {
    const { paymentMethod, ...withoutMethod } = validCheckout;

    expect(paymentMethod).toBe("qris");
    expect(checkoutSchema.safeParse(withoutMethod).success).toBe(false);
  });

  it("rejects a channel Mayar does not accept on an invoice", () => {
    // Enabled on the account, but absent from the documented paymentMethod
    // list, so it must never reach the invoice endpoint.
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      paymentMethod: "ewallet/ovo",
    });

    expect(result.success).toBe(false);
  });

  it("requires a cashtag for Jenius and nothing else", () => {
    const withoutCashtag = checkoutSchema.safeParse({
      ...validCheckout,
      paymentMethod: "ewallet/jeniuspay",
    });
    const withCashtag = checkoutSchema.safeParse({
      ...validCheckout,
      cashtag: "$buyer",
      paymentMethod: "ewallet/jeniuspay",
    });

    expect(withoutCashtag.success).toBe(false);
    expect(withCashtag.success).toBe(true);
    expect(
      checkoutSchema.safeParse({ ...validCheckout, paymentMethod: "va/bni" })
        .success
    ).toBe(true);
  });
});

describe("order lookup validation", () => {
  it("accepts a then. order number", () => {
    const result = orderLookupSchema.safeParse({
      email: "customer@example.com",
      orderNumber: "THN-20260806051753-E99750",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a malformed order number", () => {
    const result = orderLookupSchema.safeParse({
      email: "customer@example.com",
      orderNumber: "ORDER-1",
    });

    expect(result.success).toBe(false);
  });
});
