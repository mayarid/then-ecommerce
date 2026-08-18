import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { findOrderAccess } from "@/lib/order.functions";
import { saveLastOrderHint } from "@/lib/order-access";

export const Route = createFileRoute("/orders/find")({
  component: FindOrderPage,
});

function FindOrderPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const result = await findOrderAccess({
        data: {
          email: String(form.get("email") ?? ""),
          orderNumber: String(form.get("orderNumber") ?? ""),
        },
      });

      saveLastOrderHint({
        createdAt: new Date().toISOString(),
        orderNumber: result.orderNumber,
        orderStatusPath: `/orders/${result.accessToken}`,
      });
      window.location.assign(`/orders/${result.accessToken}`);
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Unable to find that order"
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-5 pt-14 pb-20 sm:px-8">
      <p className="text-muted-foreground text-sm">Orders</p>
      <h1 className="mt-3 font-heading font-medium text-5xl tracking-[-0.06em]">
        Find your order
      </h1>
      <p className="mt-4 text-muted-foreground text-sm leading-6">
        Enter the email used at checkout and your order number. We open a fresh
        status link for matching orders.
      </p>

      <form className="mt-10" onSubmit={submit}>
        <FieldGroup>
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
            <FieldLabel htmlFor="orderNumber">Order number</FieldLabel>
            <Input
              aria-invalid={Boolean(error)}
              autoComplete="off"
              id="orderNumber"
              name="orderNumber"
              placeholder="THN-20260806123456-ABC123"
              required
            />
          </Field>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to find that order</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button className="w-full" disabled={submitting} type="submit">
            {submitting ? <Spinner data-icon="inline-start" /> : null}
            {submitting ? "Looking up order" : "Open order status"}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-8 text-muted-foreground text-sm">
        Have an account?{" "}
        <Button
          nativeButton={false}
          render={<Link to="/account/orders" />}
          variant="link"
        >
          View signed-in order history
        </Button>
      </p>
    </main>
  );
}
