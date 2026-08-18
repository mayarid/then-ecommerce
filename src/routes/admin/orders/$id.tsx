import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAdminOrder,
  markOrderRefunded,
  resyncOrderPayment,
  updateOrderStatus,
} from "@/lib/admin.functions";
import { formatIdr, formatOrderStatus } from "@/lib/format";

export const Route = createFileRoute("/admin/orders/$id")({
  component: AdminOrderDetail,
  loader: ({ params }) => getAdminOrder({ data: { id: params.id } }),
});

type NextOrderStatus = "delivered" | "processing" | "shipped";

function nextStatusesFor(status: string): readonly NextOrderStatus[] {
  switch (status) {
    case "paid":
      return ["processing"];
    case "processing":
      return ["shipped"];
    case "shipped":
      return ["delivered"];
    default:
      return [];
  }
}

function AdminOrderDetail() {
  const { attempts, history, items, order } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingRefund, setConfirmingRefund] = useState(false);

  async function update(
    status: "cancelled" | "delivered" | "processing" | "shipped"
  ) {
    setBusy(true);
    setError("");

    try {
      await updateOrderStatus({ data: { orderId: order.id, status } });
      await router.invalidate();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update order"
      );
    } finally {
      setBusy(false);
    }
  }

  async function resync() {
    setBusy(true);
    setError("");

    try {
      await resyncOrderPayment({ data: { id: order.id } });
      await router.invalidate();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to resync payment"
      );
    } finally {
      setBusy(false);
    }
  }

  async function markRefunded() {
    setBusy(true);
    setError("");

    try {
      await markOrderRefunded({ data: { id: order.id } });
      setConfirmingRefund(false);
      await router.invalidate();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to mark refund"
      );
    } finally {
      setBusy(false);
    }
  }

  const nextStatuses = nextStatusesFor(order.status);

  return (
    <section>
      <Link
        className="inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        to="/admin/orders"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to orders
      </Link>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-muted-foreground text-sm">
            Order {order.orderNumber}
          </p>
          <h2 className="mt-2 font-heading font-medium text-4xl tracking-[-0.05em]">
            {formatOrderStatus(order.status)}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {nextStatuses.map((status) => (
            <Button disabled={busy} key={status} onClick={() => update(status)}>
              Mark {formatOrderStatus(status)}
            </Button>
          ))}
          {order.status === "pending_payment" ? (
            <Button disabled={busy} onClick={resync} variant="outline">
              <RefreshCw aria-hidden="true" data-icon="inline-start" />
              Resync payment
            </Button>
          ) : null}
          {order.paymentStatus === "paid" ? (
            <Button
              disabled={busy}
              onClick={() => setConfirmingRefund(true)}
              variant="destructive"
            >
              Mark refunded
            </Button>
          ) : null}
        </div>
      </div>

      {busy ? (
        <p className="mt-4 inline-flex items-center gap-2 text-muted-foreground text-sm">
          <Spinner />
          Updating order
        </p>
      ) : null}
      {error ? (
        <Alert className="mt-4" variant="destructive">
          <AlertTitle>Unable to update order</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer and shipping</CardTitle>
          </CardHeader>
          <CardContent>
            <address className="text-muted-foreground text-sm not-italic leading-6">
              {order.guestName}
              <br />
              {order.guestEmail}
              <br />
              {order.guestPhone}
              <br />
              <br />
              {order.addressLine}
              <br />
              {order.city}, {order.province} {order.postalCode}
            </address>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge variant="secondary">
                    {formatOrderStatus(order.paymentStatus)}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Amount</dt>
                <dd>{formatIdr(order.total)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Transaction</dt>
                <dd className="max-w-[14rem] truncate">
                  {order.mayarTransactionId ?? "Pending"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.productName} × {item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatIdr(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  {formatIdr(order.total)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Payment attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell className="text-muted-foreground">
                      {attempt.invoiceId}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatOrderStatus(attempt.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              No payment attempt recorded.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Badge variant="secondary">
                      {formatOrderStatus(entry.toStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.note ?? "Status updated"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        onOpenChange={(next) => {
          if (!next) {
            setConfirmingRefund(false);
          }
        }}
        open={confirmingRefund}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark order refunded</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm only after you complete the refund in Mayar. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={markRefunded}
              variant="destructive"
            >
              {busy ? <Spinner data-icon="inline-start" /> : null}
              Mark order refunded
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
