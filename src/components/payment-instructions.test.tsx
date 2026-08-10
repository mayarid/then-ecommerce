// @vitest-environment jsdom

import decodeQR from "@paulmillr/qr/decode.js";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PaymentInstructions } from "./payment-instructions";

// This project registers no global test setup, so the automatic unmount that
// Testing Library normally installs is not there. Without this, one render
// stays in the document and the next assertion reads the previous screen.
afterEach(cleanup);

// A well-formed QRIS payload: EMVCo tag-length-value with a valid CRC16, the
// shape Mayar returns in production. The sandbox only ever answers with
// placeholder words, so this is the one way to prove the code we draw can
// actually be scanned. See ADR-0017.
const QRIS_PAYLOAD =
  "00020101021226660014ID.CO.QRIS.WWW01189360001400000000010215THENSTORETEST010303UMI52045732530336054061890005802ID5915THEN STORE TEST6007JAKARTA6304EC19";

const SCALE = 6;

/**
 * Rasterises the rendered QR so a decoder can read it back.
 *
 * The modules are taken from the DOM rather than from the encoder, so this
 * measures what a buyer's camera would see, not what the library was asked for.
 */
function rasterise(svg: SVGElement) {
  const size = Number(svg.getAttribute("viewBox")?.split(" ")[2]);
  const px = size * SCALE;
  const data = new Uint8Array(px * px * 3).fill(255);

  for (const rect of svg.querySelectorAll("rect")) {
    const mx = Number(rect.getAttribute("x"));
    const my = Number(rect.getAttribute("y"));

    for (let dy = 0; dy < SCALE; dy += 1) {
      for (let dx = 0; dx < SCALE; dx += 1) {
        const at = ((my * SCALE + dy) * px + (mx * SCALE + dx)) * 3;

        data[at] = 0;
        data[at + 1] = 0;
        data[at + 2] = 0;
      }
    }
  }

  return { data, height: px, width: px };
}

describe("payment instructions", () => {
  it("draws a QR a scanner can read back to the exact payload", () => {
    render(
      <PaymentInstructions
        instruction={{
          expiresAt: null,
          kind: "qris",
          qrString: QRIS_PAYLOAD,
        }}
      />
    );

    const svg = screen.getByTitle("QRIS payment code").closest("svg");

    expect(svg).not.toBeNull();
    // Decoded by a different library from the one that drew it, so a bug in
    // either would show up here.
    expect(decodeQR(rasterise(svg as SVGElement))).toBe(QRIS_PAYLOAD);
  });

  it("shows a virtual account number as text, not a code to scan", () => {
    render(
      <PaymentInstructions
        instruction={{
          accountName: "Buyer",
          bank: "PERMATA",
          expiresAt: null,
          kind: "virtual_account",
          number: "82149999375957",
        }}
      />
    );

    expect(screen.getByText("82149999375957")).toBeDefined();
    expect(screen.queryByTitle("QRIS payment code")).toBeNull();
  });

  it("offers the wallet deeplink when there is no code to draw", () => {
    render(
      <PaymentInstructions
        instruction={{
          deeplinkUrl: "https://wallet.example.com/pay/abc",
          kind: "ewallet",
          provider: "SHOPEEPAY",
          qrString: null,
        }}
      />
    );

    expect(screen.getByText("Open the app").closest("a")?.href).toBe(
      "https://wallet.example.com/pay/abc"
    );
    expect(screen.queryByTitle("E-wallet payment code")).toBeNull();
  });
});
