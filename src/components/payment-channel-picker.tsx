import { Landmark, QrCode, Store, Wallet } from "lucide-react";

import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  PAYMENT_CHANNEL_GROUPS,
  type PaymentChannel,
  type PaymentChannelGroup,
  type PaymentMethod,
} from "@/lib/payment-channels";

// Mayar reports a logo path such as `/dana.png`, but publishes no host to
// resolve it against, so a local icon per group is used instead of guessing.
const groupIcons: Record<PaymentChannelGroup, typeof QrCode> = {
  ewallet: Wallet,
  qris: QrCode,
  retail: Store,
  va: Landmark,
};

export function PaymentChannelPicker({
  cashtag,
  channels,
  onCashtagChange,
  onValueChange,
  value,
}: {
  cashtag: string;
  channels: PaymentChannel[];
  onCashtagChange: (next: string) => void;
  onValueChange: (next: PaymentMethod) => void;
  value: PaymentMethod | "";
}) {
  const selected = channels.find((channel) => channel.paymentMethod === value);

  if (channels.length === 0) {
    return (
      <p
        className="rounded-2xl bg-destructive/10 p-4 text-destructive text-sm"
        role="alert"
      >
        We cannot load the payment methods right now. Reload the page, or try
        again in a few minutes.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <RadioGroup
        aria-labelledby="payment-heading"
        className="gap-6"
        onValueChange={(next) => onValueChange(next as PaymentMethod)}
        value={value}
      >
        {PAYMENT_CHANNEL_GROUPS.map(({ group, label }) => {
          const groupChannels = channels.filter(
            (channel) => channel.group === group
          );

          if (groupChannels.length === 0) {
            return null;
          }

          const Icon = groupIcons[group];

          return (
            <div key={group}>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                {label}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {groupChannels.map((channel) => (
                  // biome-ignore lint/a11y/noLabelWithoutControl: RadioGroupItem renders a hidden native radio input beside itself, which this label wraps and drives.
                  <label
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm transition-colors has-data-checked:border-foreground hover:bg-muted/50"
                    key={channel.paymentMethod}
                  >
                    <RadioGroupItem value={channel.paymentMethod} />
                    <Icon
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                    <span>{channel.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </RadioGroup>

      {selected?.needsCashtag ? (
        <label className="block space-y-2" htmlFor="cashtag">
          <span className="text-sm">Jenius cashtag</span>
          <Input
            id="cashtag"
            maxLength={64}
            name="cashtag"
            onChange={(event) => onCashtagChange(event.target.value)}
            placeholder="$yourcashtag"
            required
            value={cashtag}
          />
          <span className="block text-muted-foreground text-xs">
            Jenius needs your cashtag to send the payment request.
          </span>
        </label>
      ) : null}
    </div>
  );
}
