import { createFileRoute } from "@tanstack/react-router";
import { Activity, PackageCheck, ShoppingCart } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
  loader: () => getAdminStats(),
});

function AdminOverview() {
  const stats = Route.useLoaderData();
  const statCards = [
    {
      icon: PackageCheck,
      label: "Active products",
      value: stats.activeProducts,
    },
    { icon: ShoppingCart, label: "Total orders", value: stats.totalOrders },
    { icon: Activity, label: "Payment source", value: "Mayar" },
  ];

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
