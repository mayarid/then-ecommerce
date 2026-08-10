import { Check, Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import { encode } from "uqr";

import { Button, buttonVariants } from "@/components/ui/button";
import type { PaymentInstruction } from "@/lib/payment-instructions";

function QrCode({ label, value }: { label: string; value: string }) {
  const matrix = useMemo(() => encode(value, { border: 1 }), [value]);
  const cells: Array<{ x: number; y: number }> = [];

  for (const [y, row] of matrix.data.entries()) {
    for (const [x, filled] of row.entries()) {
      if (filled) {
        cells.push({ x, y });
      }
    }
  }

  return (
    <svg
      className="size-56 rounded-2xl bg-white p-3"
      role="img"
      viewBox={`0 0 ${matrix.size} ${matrix.size}`}
    >
      <title>{label}</title>
      {cells.map((cell) => (
        <rect
          fill="currentColor"
          height={1}
          key={`${cell.x}-${cell.y}`}
          width={1}
          x={cell.x}
          y={cell.y}
        />
      ))}
    </svg>
  );
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const caption = copied ? "Copied" : label;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      className="bg-background/10 text-background hover:bg-background/20"
      onClick={copy}
      type="button"
      variant="ghost"
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {caption}
    </Button>
  );
}

/**
 * The payment step rendered from Mayar's own instructions.
 *
 * Every branch is a best effort. The order page keeps the hosted payment link
 * beside this, so a buyer is never stranded when an instruction is missing or a
 * channel offers none, which is the case for a retail outlet. See ADR-0017.
 */
export function PaymentInstructions({
  instruction,
}: {
  instruction: PaymentInstruction;
}) {
  if (instruction.kind === "virtual_account") {
    return (
      <div className="mt-6 rounded-2xl bg-background/10 p-5">
        <p className="text-background/70 text-sm">
          Transfer to this {instruction.bank} virtual account
        </p>
        <p className="mt-3 font-medium text-3xl tabular-nums tracking-tight">
          {instruction.number}
        </p>
        {instruction.accountName ? (
          <p className="mt-2 text-background/70 text-sm">
            Account name: {instruction.accountName}
          </p>
        ) : null}
        <div className="mt-4">
          <CopyButton label="Copy account number" value={instruction.number} />
        </div>
      </div>
    );
  }

  if (instruction.kind === "qris") {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-5 rounded-2xl bg-background/10 p-5">
        <div className="text-foreground">
          <QrCode label="QRIS payment code" value={instruction.qrString} />
        </div>
        <div>
          <p className="font-medium">Scan with any QRIS app</p>
          <p className="mt-2 max-w-xs text-background/70 text-sm leading-6">
            GoPay, OVO, DANA, ShopeePay, or your bank app. The amount is already
            in the code.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl bg-background/10 p-5">
      <p className="font-medium">
        {instruction.provider
          ? `Continue in ${instruction.provider}`
          : "Continue in your e-wallet"}
      </p>
      {instruction.qrString ? (
        <div className="mt-4 text-foreground">
          <QrCode label="E-wallet payment code" value={instruction.qrString} />
        </div>
      ) : null}
      {instruction.deeplinkUrl ? (
        <a
          className={buttonVariants({
            className:
              "mt-4 bg-background text-foreground hover:bg-background/85",
            variant: "secondary",
          })}
          href={instruction.deeplinkUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open the app
          <ExternalLink aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}
