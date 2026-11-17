
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PurchaseOrder = {
  id: string;
  orderNumber?: string | null;
  status: string;
  createdAt: string;
  totalAmount?: number | string | null;
};

type Supplier = {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    purchaseOrders: number;
  };
  purchaseOrders: PurchaseOrder[];
};

function formatDate(date?: string | null) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(value?: number | string | null) {
  if (value === undefined || value === null) return "—";

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    ORDERED: "bg-blue-100 text-blue-700",
    PARTIALLY_RECEIVED: "bg-amber-100 text-amber-700",
    RECEIVED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#9A887B]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-[#2B1B14]">
        {value?.trim() || "Not provided"}
      </p>
    </div>
  );
}

export default function SupplierDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supplierId = params.id;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSupplier = useCallback(async () => {
    if (!supplierId) {
      setError("Invalid supplier ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/suppliers/${encodeURIComponent(supplierId)}`,
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.supplier) {
        throw new Error(
          result.message || "Failed to load supplier details."
        );
      }

      setSupplier(result.supplier);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading supplier."
      );
      setSupplier(null);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchSupplier();
  }, [fetchSupplier]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F8F3ED]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#E8D9CA] border-t-[#754426]" />
          <p className="mt-4 text-sm text-[#8B7768]">
            Loading supplier details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="min-h-screen bg-[#F8F3ED] p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-800">
            Unable to load supplier
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error || "Supplier not found."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={fetchSupplier}
              className="rounded-lg bg-[#754426] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5D351D]"
            >
              Try Again
            </button>

            <button
              onClick={() => router.push("/admin/suppliers")}
              className="rounded-lg border border-[#E8D9CA] px-4 py-2 text-sm font-semibold text-[#754426]"
            >
              Back to Suppliers
            </button>
          </div>
        </div>
      </div>
    );
  }

  const orders = supplier.purchaseOrders ?? [];
  const totalOrders = supplier._count?.purchaseOrders ?? 0;

  const receivedOrders = orders.filter(
    (order) => order.status === "RECEIVED"
  ).length;

  const pendingOrders = orders.filter((order) =>
    ["ORDERED", "PARTIALLY_RECEIVED"].includes(order.status)
  ).length;

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 text-[#2B1B14] md:p-7">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <button
              onClick={() => router.push("/admin/suppliers")}
              className="mb-3 flex items-center gap-2 text-sm font-medium text-[#8B7768] hover:text-[#754426]"
            >
              ← Back to Suppliers
            </button>

            <h1 className="text-2xl font-bold md:text-3xl">
              Supplier Details
            </h1>

            <p className="mt-1 text-sm text-[#8B7768]">
              View supplier information and purchase history.
            </p>
          </div>

          <button
            onClick={() => router.push("/admin/suppliers")}
            className="rounded-xl bg-[#754426] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5D351D]"
          >
            Manage Suppliers
          </button>
        </div>

        {/* Supplier Profile */}
        <section className="rounded-2xl border border-[#E8D9CA] bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#F2E5D8] text-2xl font-bold text-[#754426]">
                {supplier.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h2 className="text-xl font-bold md:text-2xl">
                  {supplier.name}
                </h2>

                <p className="mt-1 text-sm text-[#8B7768]">
                  {supplier.contactPerson || "No contact person added"}
                </p>

                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    supplier.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {supplier.isActive ? "Active Supplier" : "Inactive Supplier"}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-[#F8F3ED] px-4 py-3">
              <p className="text-xs text-[#8B7768]">Supplier ID</p>
              <p className="mt-1 max-w-[180px] break-all text-sm font-semibold text-[#754426]">
                {supplier.id}
              </p>
            </div>
          </div>
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total Purchase Orders"
            value={totalOrders}
            color="text-[#754426]"
          />

          <SummaryCard
            title="Received Orders"
            value={receivedOrders}
            color="text-green-700"
            description="Among the 10 most recent orders"
          />

          <SummaryCard
            title="Pending Orders"
            value={pendingOrders}
            color="text-amber-600"
            description="Among the 10 most recent orders"
          />
        </section>

        {/* Contact Information */}
        <section className="rounded-2xl border border-[#E8D9CA] bg-white p-5 shadow-sm md:p-7">
          <h2 className="mb-6 text-lg font-bold">
            Contact Information
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Contact Person" value={supplier.contactPerson} />
            <DetailItem label="Email Address" value={supplier.email} />
            <DetailItem label="Phone Number" value={supplier.phone} />
          </div>
        </section>

        {/* Address */}
        <section className="rounded-2xl border border-[#E8D9CA] bg-white p-5 shadow-sm md:p-7">
          <h2 className="mb-6 text-lg font-bold">
            Address Information
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Address" value={supplier.address} />
            <DetailItem label="City" value={supplier.city} />
            <DetailItem label="State" value={supplier.state} />
            <DetailItem label="Pincode" value={supplier.pincode} />
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-2xl border border-[#E8D9CA] bg-white p-5 shadow-sm md:p-7">
          <h2 className="mb-3 text-lg font-bold">
            Additional Notes
          </h2>

          <p className="whitespace-pre-wrap text-sm leading-6 text-[#78675B]">
            {supplier.notes || "No additional notes available."}
          </p>
        </section>

        {/* Purchase Order History */}
        <section className="overflow-hidden rounded-2xl border border-[#E8D9CA] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-[#F0E6DC] p-5 sm:flex-row sm:items-center md:px-7">
            <div>
              <h2 className="text-lg font-bold">
                Purchase Order History
              </h2>

              <p className="mt-1 text-sm text-[#8B7768]">
                Showing up to 10 most recent purchase orders.
              </p>
            </div>

            <button
              onClick={() => router.push("/admin/purchase-orders")}
              className="rounded-lg border border-[#E8D9CA] px-4 py-2 text-sm font-semibold text-[#754426] hover:bg-[#F8F3ED]"
            >
              View All Orders
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F8F3ED] text-2xl">
                📦
              </div>

              <h3 className="mt-4 font-semibold">
                No purchase orders yet
              </h3>

              <p className="mt-1 text-sm text-[#8B7768]">
                Purchase orders created for this supplier will appear here.
              </p>

              <button
                onClick={() => router.push("/admin/purchase-orders")}
                className="mt-5 rounded-lg bg-[#754426] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5D351D]"
              >
                Go to Purchase Orders
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead className="bg-[#FAF7F3] text-xs uppercase tracking-wide text-[#8B7768]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Order Number</th>
                    <th className="px-6 py-4 font-semibold">Order Date</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 text-right font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F0E6DC]">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#FFFCF9]">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-[#754426]">
                          {order.orderNumber || order.id.slice(-8).toUpperCase()}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-[#5D4A3D]">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold">
                        {formatCurrency(order.totalAmount)}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            router.push(`/admin/purchase-orders/${order.id}`)
                          }
                          className="text-sm font-semibold text-[#754426] hover:underline"
                        >
                          View Details →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Record Information */}
        <section className="rounded-2xl border border-[#E8D9CA] bg-white p-5 shadow-sm md:p-7">
          <h2 className="mb-5 text-lg font-bold">
            Record Information
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DetailItem
              label="Supplier Created"
              value={formatDate(supplier.createdAt)}
            />

            <DetailItem
              label="Last Updated"
              value={formatDate(supplier.updatedAt)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  color,
  description,
}: {
  title: string;
  value: number;
  color: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#E8D9CA] bg-white p-5 shadow-sm">
      <p className="text-sm text-[#8B7768]">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>
        {value.toLocaleString("en-IN")}
      </p>
      {description && (
        <p className="mt-1 text-xs text-[#A18E80]">{description}</p>
      )}
    </div>
  );
}
