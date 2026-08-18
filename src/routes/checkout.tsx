import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";

import { useCart } from "@/components/cart-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useCartProducts } from "@/hooks/use-cart-products";
import { formatIdr } from "@/lib/format";
import { createOrder } from "@/lib/order.functions";
import { saveLastOrderHint } from "@/lib/order-access";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { clear, lines } = useCart();
  const {
    error: cartError,
    items,
    loading,
    retry,
    subtotal,
  } = useCartProducts();
  const [submitting, setSubmitting] = useState(false);
  // One key for this checkout attempt. A failed submit reuses it, so a retry is
  // recognised as the same checkout rather than a new one. See ADR-0003.
  const idempotencyKey = useRef(crypto.randomUUID());
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const result = await createOrder({
        data: {
          addressLine: String(form.get("addressLine") ?? ""),
          city: String(form.get("city") ?? ""),
          email: String(form.get("email") ?? ""),
          guestName: String(form.get("guestName") ?? ""),
          lines: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
          phone: String(form.get("phone") ?? ""),
          postalCode: String(form.get("postalCode") ?? ""),
          province: String(form.get("province") ?? ""),
        },
        headers: { "Idempotency-Key": idempotencyKey.current },
      });

      const orderStatusPath = `/orders/${result.accessToken}`;

      saveLastOrderHint({
        createdAt: new Date().toISOString(),
        orderNumber: result.orderNumber,
        orderStatusPath,
      });
      idempotencyKey.current = crypto.randomUUID();
      clear();
      window.location.assign(orderStatusPath);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create your order. Check the form and try again."
      );
      setSubmitting(false);
    }
  }

  if (cartError) {
    return (
      <main className="mx-auto max-w-3xl px-5 pt-20 pb-32 text-center sm:px-8">
        <h1 className="font-heading font-medium text-4xl tracking-[-0.05em]">
          Could not load your bag.
        </h1>
        <Alert className="mt-6" variant="destructive">
          <AlertTitle>Unable to load your bag</AlertTitle>
          <AlertDescription>{cartError}</AlertDescription>
        </Alert>
        <p className="mt-4 text-muted-foreground text-sm">
          Your items are still saved on this device.
        </p>
        <Button className="mt-8" onClick={retry} type="button">
          Try again
        </Button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-20 pb-32 sm:px-8">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-20 pb-32 sm:px-8">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Your bag is empty.</EmptyTitle>
            <EmptyDescription>
              Lost an order link?{" "}
              <Link to="/orders/find">Find your order</Link>
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button nativeButton={false} render={<Link to="/products" />}>
              Browse the collection
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pt-10 pb-20 sm:px-8">
      <Link
        className="inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        to="/cart"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to bag
      </Link>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_0.72fr]">
        <div>
          <p className="text-muted-foreground text-sm">Checkout</p>
          <h1 className="mt-3 font-heading font-medium text-5xl tracking-[-0.06em]">
            Where should we send it?
          </h1>
          <form className="mt-10" onSubmit={submit}>
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Contact</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={error ? true : undefined}>
                    <FieldLabel htmlFor="guestName">Full name</FieldLabel>
                    <Input
                      aria-invalid={Boolean(error)}
                      autoComplete="name"
                      id="guestName"
                      name="guestName"
                      required
                    />
                  </Field>
                  <Field data-invalid={error ? true : undefined}>
                    <FieldLabel htmlFor="email">Email address</FieldLabel>
                    <Input
                      aria-invalid={Boolean(error)}
                      autoComplete="email"
                      id="email"
                      name="email"
                      required
                      type="email"
                    />
                  </Field>
                  <Field data-invalid={error ? true : undefined}>
                    <FieldLabel htmlFor="phone">Phone number</FieldLabel>
                    <Input
                      aria-invalid={Boolean(error)}
                      autoComplete="tel"
                      id="phone"
                      name="phone"
                      required
                      type="tel"
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>

              <FieldSet>
                <FieldLegend>Shipping address</FieldLegend>
                <FieldGroup>
                  <Field data-invalid={error ? true : undefined}>
                    <FieldLabel htmlFor="addressLine">Address</FieldLabel>
                    <Input
                      aria-invalid={Boolean(error)}
                      autoComplete="street-address"
                      id="addressLine"
                      name="addressLine"
                      placeholder="Street and house number"
                      required
                    />
                  </Field>
                  <Field data-invalid={error ? true : undefined}>
                    <FieldLabel htmlFor="city">City</FieldLabel>
                    <Input
                      aria-invalid={Boolean(error)}
                      autoComplete="address-level2"
                      id="city"
                      name="city"
                      required
                    />
                  </Field>
                  <Field data-invalid={error ? true : undefined}>
                    <FieldLabel htmlFor="province">Province</FieldLabel>
                    <Input
                      aria-invalid={Boolean(error)}
                      autoComplete="address-level1"
                      id="province"
                      name="province"
                      required
                    />
                  </Field>
                  <Field data-invalid={error ? true : undefined}>
                    <FieldLabel htmlFor="postalCode">Postal code</FieldLabel>
                    <Input
                      aria-invalid={Boolean(error)}
                      autoComplete="postal-code"
                      id="postalCode"
                      maxLength={5}
                      name="postalCode"
                      pattern="\d{5}"
                      required
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Unable to continue</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                className="w-full sm:w-auto"
                disabled={submitting}
                type="submit"
              >
                {submitting ? <Spinner data-icon="inline-start" /> : null}
                {submitting ? "Creating order" : "Continue to payment"}
              </Button>
            </FieldGroup>
          </form>
        </div>

        <aside className="h-fit rounded-3xl bg-muted/60 p-6 lg:sticky lg:top-6">
          <h2 className="font-medium">Order summary</h2>
          <div className="mt-5 flex flex-col gap-4">
            {items.map(({ line, product }) => (
              <div
                className="flex justify-between gap-4 text-sm"
                key={product.id}
              >
                <span className="text-muted-foreground">
                  {product.name} × {line.quantity}
                </span>
                <span className="shrink-0">
                  {formatIdr(product.price * line.quantity)}
                </span>
              </div>
            ))}
          </div>
          <Separator className="mt-6" />
          <div className="pt-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatIdr(subtotal)}</span>
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <p className="mt-5 text-muted-foreground text-xs leading-5">
              Your stock is reserved for 30 minutes while payment is completed.
              Save the order status page after checkout to track this order.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
