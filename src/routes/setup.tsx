import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getSetupStatus, runSetup } from "@/lib/setup.functions";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
  loader: () => getSetupStatus(),
});

type SetupResult = Awaited<ReturnType<typeof runSetup>>;

function SetupPage() {
  const status = Route.useLoaderData();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SetupResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      setResult(
        await runSetup({
          data: {
            email: String(form.get("email") ?? ""),
            name: String(form.get("name") ?? ""),
            password: String(form.get("password") ?? ""),
            token: String(form.get("token") ?? ""),
          },
        })
      );
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Setup failed. Check the values and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-16 pb-32 sm:px-8">
        <p className="text-muted-foreground text-sm">Setup</p>
        <h1 className="mt-3 font-heading font-medium text-4xl tracking-[-0.05em]">
          Your store is ready.
        </h1>
        <p className="mt-4 text-muted-foreground">
          {result.seeded.products} sample products added, {result.seeded.images}{" "}
          with images.
        </p>

        <section className="mt-10 rounded-3xl border p-6">
          <h2 className="font-medium">One step left</h2>
          <p className="mt-2 text-muted-foreground text-sm leading-6">
            Register this URL as your Mayar webhook. It contains a secret, so
            treat it like a password. This page will not show it again.
          </p>
          <code className="mt-4 block overflow-x-auto rounded-2xl bg-muted p-4 text-xs">
            {result.webhookUrl}
          </code>
          <p className="mt-4 text-muted-foreground text-sm leading-6">
            Registering it is optional. Payments are always proved by looking
            the transaction up with Mayar, and a scheduled job reconciles orders
            every five minutes. The webhook only makes confirmation faster.
          </p>
        </section>

        <Button
          className="mt-8"
          nativeButton={false}
          render={<Link to="/admin" />}
        >
          Go to the admin area
        </Button>
      </main>
    );
  }

  if (status.complete) {
    return (
      <main className="mx-auto max-w-2xl px-5 pt-20 pb-32 text-center sm:px-8">
        <h1 className="font-heading font-medium text-4xl tracking-[-0.05em]">
          Setup already ran.
        </h1>
        <p className="mt-4 text-muted-foreground">
          This store is configured. Sign in with your administrator account.
        </p>
        <Button
          className="mt-8"
          nativeButton={false}
          render={<Link to="/sign-in" />}
        >
          Sign in
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-5 pt-16 pb-32 sm:px-8">
      <p className="text-muted-foreground text-sm">Setup</p>
      <h1 className="mt-3 font-heading font-medium text-4xl tracking-[-0.05em]">
        Create your administrator.
      </h1>
      <p className="mt-4 text-muted-foreground text-sm leading-6">
        This runs once. It creates the first administrator, adds sample
        products, and generates your Mayar webhook secret.
      </p>

      {status.tokenConfigured ? null : (
        <Alert className="mt-6" variant="destructive">
          <AlertTitle>Setup token missing</AlertTitle>
          <AlertDescription>
            SETUP_TOKEN is not set. Add it as a Worker secret, then reload.
          </AlertDescription>
        </Alert>
      )}

      <form className="mt-8" onSubmit={submit}>
        <FieldGroup>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="setup-token">Setup token</FieldLabel>
            <Input
              aria-invalid={Boolean(error)}
              autoComplete="off"
              id="setup-token"
              name="token"
              required
              type="password"
            />
          </Field>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="setup-name">Your name</FieldLabel>
            <Input
              aria-invalid={Boolean(error)}
              id="setup-name"
              name="name"
              required
              type="text"
            />
          </Field>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="setup-email">Email</FieldLabel>
            <Input
              aria-invalid={Boolean(error)}
              id="setup-email"
              name="email"
              required
              type="email"
            />
          </Field>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="setup-password">Password</FieldLabel>
            <Input
              aria-invalid={Boolean(error)}
              autoComplete="new-password"
              id="setup-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </Field>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to complete setup</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            className="mt-2"
            disabled={submitting || !status.tokenConfigured}
            type="submit"
          >
            {submitting ? <Spinner data-icon="inline-start" /> : null}
            {submitting ? "Completing setup" : "Complete setup"}
          </Button>
        </FieldGroup>
      </form>
    </main>
  );
}
