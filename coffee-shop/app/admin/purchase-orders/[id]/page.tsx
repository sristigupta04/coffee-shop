
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Supplier = {
  id: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
};

type Product = {
  id: string;
  name: string;
  image?: string | null;
  stock: number;
};

type OrderItem = {
  id: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
  product: Product;
};

type PurchaseOrder = {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  shippingCost: number;
  totalAmount: number;
  notes?: string | null;
  expectedDate?: string | null;
  orderedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: Supplier;
  items: OrderItem[];
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);

const statusStyle: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  ORDERED: "bg-blue-100 text-blue-700",
  PARTIALLY_RECEIVED: "bg-amber-100 text-amber-800",
  RECEIVED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PurchaseOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadOrder = useCallback(async () => {
    setError("");

    try {
      const response = await fetch(
        `/api/admin/purchase-orders/${params.id}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load purchase order");
      }

      setOrder(data.purchaseOrder);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const refresh = async () => {
    setRefreshing(true);
    await loadOrder();
  };

  const totalOrdered =
    order?.items.reduce((sum, item) => sum + item.orderedQuantity, 0) || 0;

  const totalReceived =
    order?.items.reduce((sum, item) => sum + item.receivedQuantity, 0) || 0;

  const totalPending = totalOrdered - totalReceived;

  const progress =
    totalOrdered > 0
      ? Math.round((totalReceived / totalOrdered) * 100)
      : 0;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F3ED]">
        <p className="text-sm text-[#80695B]">
          Loading purchase order...
        </p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#F8F3ED] p-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-[#EADED4] bg-white p-6">
          <h1 className="text-xl font-bold">Purchase Order Not Found</h1>
          <p className="mt-2 text-sm text-red-600">
            {error || "Unable to find this purchase order."}
          </p>
          <button
            onClick={() => router.push("/admin/purchase-orders")}
            className="mt-5 rounded-lg bg-[#754426] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Purchase Orders
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 text-[#2B1B14] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() => router.push("/admin/purchase-orders")}
              className="mb-3 text-sm font-semibold text-[#A76535] hover:underline"
            >
              ← Back to Purchase Orders
            </button>

            <h1 className="text-2xl font-bold sm:text-3xl">
              {order.orderNumber}
            </h1>

            <p className="mt-1 text-sm text-[#80695B]">
              Created {formatDate(order.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                statusStyle[order.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {order.status.replaceAll("_", " ")}
            </span>

            <button
              onClick={refresh}
              disabled={refreshing}
              className="rounded-lg border border-[#EADED4] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#F8F3ED] disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            {order.status === "DRAFT" && (
              <button
                onClick={() =>
                  router.push(
                    `/admin/purchase-orders/${order.id}/edit`
                  )
                }
                className="rounded-lg bg-[#754426] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2B1B14]"
              >
                Edit Order
              </button>
            )}

            {["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status) && (
              <button
                onClick={() =>
                  router.push(
                    `/admin/purchase-orders?receive=${order.id}`
                  )
                }
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Receive Stock
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Progress */}
        <section className="rounded-xl border border-[#EADED4] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Receiving Progress</h2>
              <p className="mt-1 text-sm text-[#80695B]">
                {totalReceived} of {totalOrdered} units received
              </p>
            </div>

            <p className="text-2xl font-bold text-[#754426]">
              {progress}%
            </p>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#EADED4]">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[#F8F3ED] p-3">
              <p className="text-xs text-[#80695B]">Ordered</p>
              <p className="mt-1 text-xl font-bold">{totalOrdered}</p>
            </div>

            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-green-700">Received</p>
              <p className="mt-1 text-xl font-bold text-green-800">
                {totalReceived}
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-3">
              <p className="text-xs text-amber-700">Pending</p>
              <p className="mt-1 text-xl font-bold text-amber-800">
                {totalPending}
              </p>
            </div>
          </div>
        </section>

        {/* Supplier and order details */}
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-[#EADED4] bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Supplier Information</h2>

            <h3 className="mt-4 text-lg font-bold">
              {order.supplier.name}
            </h3>

            <div className="mt-4 space-y-2 text-sm">
              {order.supplier.contactPerson && (
                <p>
                  <span className="text-[#80695B]">Contact: </span>
                  {order.supplier.contactPerson}
                </p>
              )}

              {order.supplier.email && (
                <p>
                  <span className="text-[#80695B]">Email: </span>
                  {order.supplier.email}
                </p>
              )}

              {order.supplier.phone && (
                <p>
                  <span className="text-[#80695B]">Phone: </span>
                  {order.supplier.phone}
                </p>
              )}

              {order.supplier.address && (
                <p>
                  <span className="text-[#80695B]">Address: </span>
                  {order.supplier.address}
                </p>
              )}

              {[order.supplier.city, order.supplier.state, order.supplier.pincode]
                .filter(Boolean)
                .length > 0 && (
                <p className="text-[#80695B]">
                  {[
                    order.supplier.city,
                    order.supplier.state,
                    order.supplier.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#EADED4] bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Order Information</h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[#80695B]">Created</span>
                <span className="text-right">{formatDate(order.createdAt)}</span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-[#80695B]">Ordered on</span>
                <span className="text-right">{formatDate(order.orderedAt)}</span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-[#80695B]">Expected delivery</span>
                <span className="text-right">
                  {order.expectedDate
                    ? new Date(order.expectedDate).toLocaleDateString("en-IN")
                    : "Not set"}
                </span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-[#80695B]">Fully received on</span>
                <span className="text-right">{formatDate(order.receivedAt)}</span>
              </div>

              <div className="flex justify-between gap-3">
                <span className="text-[#80695B]">Last updated</span>
                <span className="text-right">{formatDate(order.updatedAt)}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Products */}
        <section className="overflow-hidden rounded-xl border border-[#EADED4] bg-white shadow-sm">
          <div className="border-b border-[#EADED4] p-5">
            <h2 className="font-semibold">Ordered Products</h2>
            <p className="mt-1 text-xs text-[#80695B]">
              Track ordered, received and remaining quantities.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#F8F3ED] text-xs uppercase text-[#80695B]">
                <tr>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4">Unit Cost</th>
                  <th className="px-5 py-4">Ordered</th>
                  <th className="px-5 py-4">Received</th>
                  <th className="px-5 py-4">Pending</th>
                  <th className="px-5 py-4">Current Stock</th>
                  <th className="px-5 py-4">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#EADED4]">
                {order.items.map((item) => {
                  const pending =
                    item.orderedQuantity - item.receivedQuantity;

                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-4 font-semibold">
                        {item.product.name}
                      </td>

                      <td className="px-5 py-4">
                        {currency(item.unitCost)}
                      </td>

                      <td className="px-5 py-4">
                        {item.orderedQuantity}
                      </td>

                      <td className="px-5 py-4 font-semibold text-green-700">
                        {item.receivedQuantity}
                      </td>

                      <td className="px-5 py-4 font-semibold text-amber-700">
                        {pending}
                      </td>

                      <td className="px-5 py-4">
                        {item.product.stock}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {currency(item.totalCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Financial summary */}
        <section className="ml-auto max-w-md rounded-xl border border-[#EADED4] bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Financial Summary</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#80695B]">Subtotal</span>
              <span>{currency(order.subtotal)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#80695B]">Tax</span>
              <span>{currency(order.tax)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#80695B]">Shipping</span>
              <span>{currency(order.shippingCost)}</span>
            </div>

            <div className="flex justify-between border-t border-[#EADED4] pt-3 text-base font-bold">
              <span>Total Amount</span>
              <span className="text-[#754426]">
                {currency(order.totalAmount)}
              </span>
            </div>
          </div>
        </section>

        {/* Notes */}
        {order.notes && (
          <section className="rounded-xl border border-[#EADED4] bg-white p-5 shadow-sm">
            <h2 className="font-semibold">Order Notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[#80695B]">
              {order.notes}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
