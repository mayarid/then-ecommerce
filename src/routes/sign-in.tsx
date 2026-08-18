import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { useCart } from "@/components/cart-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { mergeCart } from "@/lib/cart.functions";
import { getSetupStatus } from "@/lib/setup.functions";

export const Route = createFileRoute("/sign-in")({
  beforeLoad: async () => {
    const { complete } = await getSetupStatus();

    if (!complete) {
      throw redirect({ to: "/setup" });
    }
  },
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { clear, lines } = useCart();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError("");
      setSubmitting(true);
      const form = new FormData(event.currentTarget);

      try {
        const result = await authClient.signIn.email({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        if (lines.length > 0) {
          await mergeCart({ data: lines });
          clear();
        }

        await navigate({ to: "/account" });
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Unable to sign in. Check your email and password."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [clear, lines, navigate]
  );

  return (
    <main className="mx-auto max-w-md px-5 pt-20 pb-32 sm:px-8">
      <p className="text-muted-foreground text-sm">Account</p>
      <h1 className="mt-3 font-heading font-medium text-5xl tracking-[-0.06em]">
        Sign in
      </h1>
      <p className="mt-4 text-muted-foreground">
        Access your order history and keep your bag synced.
      </p>
      <form className="mt-10" onSubmit={submit}>
        <FieldGroup>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="sign-in-email">Email address</FieldLabel>
            <Input
              aria-invalid={Boolean(error)}
              autoComplete="email"
              id="sign-in-email"
              name="email"
              required
              type="email"
            />
          </Field>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
            <Input
              aria-invalid={Boolean(error)}
              autoComplete="current-password"
              id="sign-in-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </Field>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to sign in</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button className="w-full" disabled={submitting} type="submit">
            {submitting ? <Spinner data-icon="inline-start" /> : null}
            {submitting ? "Signing in" : "Sign in"}
          </Button>
        </FieldGroup>
      </form>
      <p className="mt-7 text-muted-foreground text-sm">
        New here?{" "}
        <Link
          className="text-foreground underline-offset-4 hover:underline"
          to="/sign-up"
        >
          Create an account
        </Link>
      </p>
    </main>
  );
}
