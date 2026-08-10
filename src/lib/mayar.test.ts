import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMayarInvoice,
  createMayarVerificationPayload,
  isMayarPaid,
  parseMayarWebhook,
} from "./mayar";

const CASHTAG_ERROR = /cashtag/;

const invoiceInput = {
  description: "Order THN-1",
  email: "buyer@example.com",
  expiredAt: "2026-08-10T06:00:00.000Z",
  extraData: { orderId: "order-1" },
  items: [{ description: "Item", quantity: 1, rate: 1000 }],
  mobile: "081234567890",
  name: "Buyer",
};

function respondWith(data: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data, messages: "success" }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        })
      )
    )
  );
}

describe("Mayar invoice creation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("refuses an invoice Mayar reports as failed inside a 200 response", async () => {
    vi.stubEnv("MAYAR_API_KEY", "test-key");
    // Sandbox-verified: asking for Jenius without a cashtag returns
    // `200 success` with the failure buried in paymentDetail.
    respondWith({
      expiredAt: 1_786_341_600_000,
      id: "invoice-1",
      link: "https://example.myr.lat/invoices/abc",
      paymentDetail: {
        errorMessage:
          "Invalid channel_properties for ID_JENIUSPAY. Expecting cashtag to be present",
        status: 400,
      },
      transactionId: "transaction-1",
    });

    await expect(createMayarInvoice({ ...invoiceInput })).rejects.toThrow(
      CASHTAG_ERROR
    );
  });

  it("accepts an invoice whose payment detail is prepared", async () => {
    vi.stubEnv("MAYAR_API_KEY", "test-key");
    respondWith({
      expiredAt: 1_786_341_600_000,
      id: "invoice-2",
      link: "https://example.myr.lat/invoices/def",
      paymentDetail: {
        status: "PENDING",
        type: "VIRTUAL_ACCOUNT",
        virtual_account: { virtual_account_number: "8808999904349030" },
      },
      transactionId: "transaction-2",
    });

    await expect(
      createMayarInvoice({ ...invoiceInput })
    ).resolves.toMatchObject({
      id: "invoice-2",
      transactionId: "transaction-2",
    });
  });

  it("accepts an invoice with no payment detail at all", async () => {
    vi.stubEnv("MAYAR_API_KEY", "test-key");
    respondWith({
      expiredAt: 1_786_341_600_000,
      id: "invoice-3",
      link: "https://example.myr.lat/invoices/ghi",
      transactionId: "transaction-3",
    });

    await expect(
      createMayarInvoice({ ...invoiceInput })
    ).resolves.toMatchObject({ id: "invoice-3" });
  });
});

describe("Mayar webhook parsing", () => {
  it("reads the documented event and transaction candidate fields", () => {
    const webhook = parseMayarWebhook({
      data: {
        amount: 189_000,
        id: "webhook-id",
        transactionId: "transaction-id",
        transactionStatus: "paid",
      },
      event: "payment.received",
    });

    expect(webhook.eventType).toBe("payment.received");
    expect(webhook.id).toBe("webhook-id");
    expect(webhook.transactionId).toBe("transaction-id");
    expect(webhook.status).toBe("paid");
  });

  it("does not treat delivery success as transaction payment", () => {
    const webhook = parseMayarWebhook({
      data: {
        amount: 189_000,
        id: "webhook-id",
        status: "SUCCESS",
        transactionId: "transaction-id",
        transactionStatus: "created",
      },
      event: "payment.reminder",
    });

    expect(webhook.status).toBe("created");
    expect(isMayarPaid(webhook.status)).toBe(false);
  });

  it("keeps reconciliation event ids separate from transaction ids", () => {
    const webhook = parseMayarWebhook(
      createMayarVerificationPayload("reconciliation-event-id", {
        amount: 189_000,
        id: "transaction-id",
        status: "paid",
      })
    );

    expect(webhook.id).toBe("reconciliation-event-id");
    expect(webhook.transactionId).toBe("transaction-id");
  });
});
