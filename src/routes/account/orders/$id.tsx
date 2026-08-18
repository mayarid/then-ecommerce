import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatIdr, formatOrderStatus } from "@/lib/format";
import { getMyOrderById } from "@/lib/order.functions";

export const Route = createFileRoute("/account/orders/$id")({
  component: AccountOrderDetailPage,
  loader: ({ params }) =>
    getMyOrderById({
      data: { orderId: params.id },
    }),
});

function AccountOrderDetailPage() {
  const { items, order } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-4xl px-5 pt-14 pb-20 sm:px-8">
      <Link
        className="inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        to="/account/orders"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to order history
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-muted-foreground text-sm">
            Order {order.orderNumber}
          </p>
          <h1 className="mt-2 font-heading font-medium text-5xl tracking-[-0.06em]">
            Order details
          </h1>
        </div>
        <Badge variant="secondary">{formatOrderStatus(order.status)}</Badge>
      </div>

      <Separator className="mt-10" />

      <section className="grid gap-8 pt-8 sm:grid-cols-2">
        <div>
          <h2 className="font-medium text-sm">Items</h2>
          <div className="mt-4 flex flex-col gap-4">
            {items.map((item) => (
              <div className="flex justify-between gap-4 text-sm" key={item.id}>
                <span className="text-muted-foreground">
                  {item.productName} × {item.quantity}
                </span>
                <span className="tabular-nums">
                  {formatIdr(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-medium text-sm">Shipping to</h2>
          <address className="mt-4 text-muted-foreground text-sm not-italic leading-6">
            {order.guestName}
            <br />
            {order.addressLine}
            <br />
            {order.city}, {order.province} {order.postalCode}
            <br />
            {order.guestPhone}
          </address>
        </div>
      </section>

      <Separator className="mt-8" />

      <dl className="grid gap-3 pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Payment</dt>
          <dd>{formatOrderStatus(order.paymentStatus)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatIdr(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="tabular-nums">{formatIdr(order.shippingAmount)}</dd>
        </div>
      </dl>

      <Separator className="mt-4" />

      <div className="flex justify-between gap-4 pt-4 font-medium text-sm">
        <span>Total</span>
        <span className="tabular-nums">{formatIdr(order.total)}</span>
      </div>
    </main>
  );
}
