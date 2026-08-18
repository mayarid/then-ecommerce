import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Activity, Check, PackageCheck, ShoppingCart } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminStats } from "@/lib/admin.functions";
import {
  dismissStoreOnboarding,
  getStoreOnboarding,
} from "@/lib/onboarding.functions";
import { setupGuideSteps } from "@/lib/setup-guide";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
  loader: async () => {
    const [onboarding, stats] = await Promise.all([
      getStoreOnboarding(),
      getAdminStats(),
    ]);

    return { onboarding, stats };
  },
});

function stepIsDone(
  id: (typeof setupGuideSteps)[number]["id"],
  onboarding: { livePayments: boolean; publicUrl: boolean }
) {
  if (id === "publicUrl") {
    return onboarding.publicUrl;
  }

  if (id === "livePayments") {
    return onboarding.livePayments;
  }

  return false;
}

function AdminOverview() {
  const { onboarding, stats } = Route.useLoaderData();
  const router = useRouter();
  const [hiding, setHiding] = useState(false);
  const statCards = [
    {
      icon: PackageCheck,
      label: "Active products",
      value: stats.activeProducts,
    },
    { icon: ShoppingCart, label: "Total orders", value: stats.totalOrders },
    { icon: Activity, label: "Payment source", value: "Mayar" },
  ];

  async function hideGuide() {
    setHiding(true);

    try {
      await dismissStoreOnboarding();
      await router.invalidate();
    } finally {
      setHiding(false);
    }
  }

  return (
    <section>
      <p className="text-muted-foreground text-sm">Overview</p>
      <h2 className="mt-2 font-heading font-medium text-4xl tracking-[-0.05em]">
        A clear view of the shop.
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {statCards.map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="flex items-center gap-2 font-medium text-3xl tracking-[-0.04em]">
                <Icon aria-hidden="true" />
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {onboarding.dismissed ? null : (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Finish your store</CardTitle>
            <CardDescription>
              These steps stay here, not on the public shop. Hide the guide when
              you are done.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-6">
              {setupGuideSteps.map((step, index) => {
                const done = stepIsDone(step.id, onboarding);

                return (
                  <li className="flex gap-4" key={step.id}>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-xs"
                    >
                      {done ? (
                        <Check aria-hidden="true" className="size-3.5" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {step.title}
                        {step.optional ? (
                          <span className="ml-2 font-normal text-muted-foreground text-xs">
                            Optional
                          </span>
                        ) : null}
                        {done ? (
                          <span className="ml-2 font-normal text-muted-foreground text-xs">
                            Done
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1.5 text-muted-foreground text-sm leading-6">
                        {step.body}
                      </p>
                      {step.id === "webhook" && onboarding.webhookUrl ? (
                        <code className="mt-3 block overflow-x-auto rounded-2xl bg-muted p-3 text-xs">
                          {onboarding.webhookUrl}
                        </code>
                      ) : null}
                      {step.to ? (
                        <Link
                          className="mt-2.5 inline-flex text-sm underline-offset-4 hover:underline"
                          to={step.to}
                        >
                          Open products
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
            <Button
              className="mt-8"
              disabled={hiding}
              onClick={hideGuide}
              type="button"
              variant="outline"
            >
              Hide setup guide
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Operational notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 text-muted-foreground text-sm leading-6">
            <li>
              Payment status is confirmed by Mayar webhooks and API resync.
            </li>
            <li>Inventory reservations expire after 30 minutes.</li>
            <li>Refunds are marked here after completing them in Mayar.</li>
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
