import { describe, expect, it } from "vitest";

import {
  isRenderableQrString,
  parsePaymentInstruction,
} from "./payment-instructions";

// A minimal but real EMVCo QRIS payload prefix. Anything Mayar returns in
// production starts this way.
const REAL_QR = "000201010212264400001";

describe("payment instruction parsing", () => {
  it("reads a virtual account exactly as the sandbox returns it", () => {
    const instruction = parsePaymentInstruction({
      status: "PENDING",
      type: "VIRTUAL_ACCOUNT",
      virtual_account: {
        amount: 2000,
        channel_code: "BNI",
        channel_properties: {
          customer_name: "XDT-Faiz Intifada",
          expires_at: "2026-08-10T06:18:24Z",
          virtual_account_number: "8808999904349030",
        },
        currency: "IDR",
      },
    });

    expect(instruction).toEqual({
      accountName: "XDT-Faiz Intifada",
      bank: "BNI",
      expiresAt: "2026-08-10T06:18:24Z",
      kind: "virtual_account",
      number: "8808999904349030",
    });
  });

  it("refuses the sandbox QRIS placeholder", () => {
    // Sandbox answers `some-random-qr-string`. Drawing it would give the buyer
    // a QR that scans to nonsense, which is worse than the hosted page.
    const instruction = parsePaymentInstruction({
      qr_code: {
        channel_code: "XENDIT",
        channel_properties: {
          expires_at: "2026-08-10T07:08:09Z",
          qr_string: "some-random-qr-string",
        },
      },
      status: "ACTIVE",
      type: "QR_CODE",
    });

    expect(instruction).toBeNull();
  });

  it("reads a QRIS payload that looks real", () => {
    const instruction = parsePaymentInstruction({
      qr_code: {
        channel_properties: {
          expires_at: "2026-08-10T07:08:09Z",
          qr_string: REAL_QR,
        },
      },
      type: "QR_CODE",
    });

    expect(instruction).toEqual({
      expiresAt: "2026-08-10T07:08:09Z",
      kind: "qris",
      qrString: REAL_QR,
    });
  });

  it("reads an e-wallet deeplink and skips its placeholder QR", () => {
    const instruction = parsePaymentInstruction({
      actions: [
        {
          action: "AUTH",
          method: "GET",
          qr_code: null,
          url: "https://ewallet-mock-connector.xendit.co/v1/checkouts?token=abc",
          url_type: "DEEPLINK",
        },
        { action: "PRESENT_TO_CUSTOMER", qr_code: "test-qr-string", url: null },
      ],
      ewallet: { channel_code: "SHOPEEPAY" },
      status: "ACTIVE",
      type: "EWALLET",
    });

    expect(instruction).toEqual({
      deeplinkUrl:
        "https://ewallet-mock-connector.xendit.co/v1/checkouts?token=abc",
      kind: "ewallet",
      provider: "SHOPEEPAY",
      qrString: null,
    });
  });

  it("returns nothing for a retail outlet, which has no instructions", () => {
    // Sandbox-verified: outlet/alfamart comes back with no paymentDetail.
    expect(parsePaymentInstruction(null)).toBeNull();
    expect(parsePaymentInstruction(undefined)).toBeNull();
  });

  it("returns nothing for a channel Mayar failed to prepare", () => {
    expect(
      parsePaymentInstruction({
        errorMessage: "Invalid channel_properties for ID_JENIUSPAY",
        status: 400,
      })
    ).toBeNull();
  });

  it("returns nothing for a shape it does not recognise", () => {
    expect(parsePaymentInstruction({ type: "SOMETHING_NEW" })).toBeNull();
    expect(parsePaymentInstruction("not an object")).toBeNull();
    expect(parsePaymentInstruction({ virtual_account: {} })).toBeNull();
  });

  it("tells a QRIS payload apart from a placeholder", () => {
    expect(isRenderableQrString(REAL_QR)).toBe(true);
    expect(isRenderableQrString("some-random-qr-string")).toBe(false);
    expect(isRenderableQrString("")).toBe(false);
    expect(isRenderableQrString(null)).toBe(false);
  });
});
