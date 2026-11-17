
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ShoppingBag,
  Search,
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import DataTable, {
  type DataTableColumn,
} from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";

type Order = {
  id: string;
  customer: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  orderType: string;
  createdAt: string;
  refundStatus: string;
  refundAmount: number | null;
  refundId: string | null;
};

type OrdersResponse = {
  success: boolean;
  message?: string;
  orders: Array<{
    id: string;
    totalPrice: number;
    status: string;
    paymentStatus: string;
    orderType: string;
    createdAt: string;
    refundStatus: string;
    refundAmount: number | null;
    refundId: string | null;
    user: {
      name: string | null;
      email: string | null;
    } | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const STATUSES = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const REFUND_STATUSES = [
  "ALL",
  "NOT_REQUESTED",
  "REFUNDING",
  "PENDING",
  "PROCESSED",
  "FAILED",
];

const PAGE_SIZE = 10;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const columns: DataTableColumn<Order>[] = [
  {
    key: "id",
    header: "Order ID",
    render: (order) => (
      <span className="font-semibold text-[#754426]">
        #{order.id.slice(-8).toUpperCase()}
      </span>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    sortable: true,
  },
  {
    key: "totalPrice",
    header: "Total",
    sortable: true,
    render: (order) => (
      <span className="font-semibold">
        {formatCurrency(order.totalPrice)}
      </span>
    ),
  },
  {
    key: "orderType",
    header: "Order Type",
    render: (order) => (
      <span className="capitalize">
        {order.orderType.replaceAll("_", " ").toLowerCase()}
      </span>
    ),
  },
  {
    key: "paymentStatus",
    header: "Payment",
    render: (order) => (
      <StatusBadge status={order.paymentStatus} />
    ),
  },
  {
    key: "status",
    header: "Order Status",
    render: (order) => (
      <StatusBadge status={order.status} />
    ),
  },
  {
    key: "refundStatus",
    header: "Refund",
    render: (order) => (
      <div className="space-y-1">
        <StatusBadge status={order.refundStatus} />
        {order.refundAmount !== null && order.refundAmount > 0 && (
          <p className="text-xs font-semibold text-[#754426]">
            {formatCurrency(order.refundAmount)}
          </p>
        )}
      </div>
    ),
  },
  {
    key: "createdAt",
    header: "Order Date",
    sortable: true,
    render: (order) =>
      new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
  },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("ALL");
  const [refundStatus, setRefundStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      if (status !== "ALL") {
        params.set("status", status);
      }

      if (refundStatus !== "ALL") {
        params.set("refundStatus", refundStatus);
      }

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await fetch(
        `/api/admin/orders?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = (await response.json()) as OrdersResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load orders."
        );
      }

      const formattedOrders: Order[] = result.orders.map((order) => ({
        id: order.id,
        customer:
          order.user?.name ||
          order.user?.email ||
          "Guest",
        totalPrice: Number(order.totalPrice) || 0,
        status: order.status,
        paymentStatus: order.paymentStatus,
        orderType: order.orderType,
        createdAt: order.createdAt,
        refundStatus: order.refundStatus || "NOT_REQUESTED",
        refundAmount:
          order.refundAmount === null
            ? null
            : Number(order.refundAmount),
        refundId: order.refundId ?? null,
      }));

      setOrders(formattedOrders);
      setTotalOrders(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setOrders([]);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [page, status, refundStatus, debouncedSearch]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const handleRefundChange = (value: string) => {
    setRefundStatus(value);
    setPage(1);
  };

  const startOrder =
    totalOrders === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const endOrder = Math.min(
    page * PAGE_SIZE,
    totalOrders
  );

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#A76535]">
              SHOP MANAGEMENT
            </p>

            <h1 className="mt-1 text-2xl font-bold text-[#2B1B14] sm:text-3xl">
              Orders Management
            </h1>

            <p className="mt-1 text-sm text-[#80695B]">
              View orders, payments and refund information.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchOrders()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2B1B14] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#754426] disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Orders
          </button>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-[#EADED4] bg-white p-5">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-[#F5E9DF] p-3">
              <ShoppingBag
                size={24}
                className="text-[#754426]"
              />
            </div>

            <div>
              <p className="text-sm text-[#80695B]">
                Total Matching Orders
              </p>
              <p className="text-2xl font-bold text-[#2B1B14]">
                {loading
                  ? "..."
                  : totalOrders.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <section className="space-y-4 rounded-2xl border border-[#EADED4] bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal
              size={18}
              className="text-[#754426]"
            />
            <h2 className="font-semibold text-[#2B1B14]">
              Filter Orders
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A18B7C]"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by order ID, customer or phone..."
                className="w-full rounded-xl border border-[#EADED4] bg-[#F8F3ED] py-3 pl-10 pr-4 text-sm text-[#2B1B14] outline-none focus:border-[#754426]"
              />
            </div>

            <select
              value={status}
              onChange={(event) =>
                handleStatusChange(event.target.value)
              }
              className="w-full rounded-xl border border-[#EADED4] bg-[#F8F3ED] px-4 py-3 text-sm text-[#2B1B14] outline-none focus:border-[#754426]"
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL"
                    ? "All Order Statuses"
                    : item.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <select
              value={refundStatus}
              onChange={(event) =>
                handleRefundChange(event.target.value)
              }
              className="w-full rounded-xl border border-[#EADED4] bg-[#F8F3ED] px-4 py-3 text-sm text-[#2B1B14] outline-none focus:border-[#754426]"
            >
              {REFUND_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === "ALL"
                    ? "All Refund Statuses"
                    : item.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}

            <button
              type="button"
              onClick={() => void fetchOrders()}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Orders table */}
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-[#2B1B14]">
              All Orders
            </h2>
            <p className="text-sm text-[#80695B]">
              {loading
                ? "Loading orders..."
                : `Showing ${startOrder}–${endOrder} of ${totalOrders} matching orders.`}
            </p>
          </div>

          <DataTable
            data={orders}
            columns={columns}
            rowKey={(order) => order.id}
            searchable={false}
            loading={loading}
            pageSize={PAGE_SIZE}
            emptyTitle="No orders found"
            emptyDescription="Try changing your search or status filter."
            rowActions={(order) => (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/orders/${encodeURIComponent(order.id)}`}
                  className="inline-flex items-center rounded-lg bg-[#F5E9DF] px-3 py-2 text-xs font-semibold text-[#754426] transition hover:bg-[#EADED4]"
                >
                  View Details
                </Link>

                {order.refundId && (
                  <span
                    title={order.refundId}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#F8F3ED] px-2 py-2 text-xs text-[#80695B]"
                  >
                    <RotateCcw size={13} />
                    Refund ID
                  </span>
                )}
              </div>
            )}
          />

          {/* Server pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex flex-col gap-3 rounded-xl border border-[#EADED4] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#80695B]">
                Page {page} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[#EADED4] px-3 py-2 text-sm font-medium text-[#5F493B] transition hover:bg-[#F8F3ED] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[#EADED4] px-3 py-2 text-sm font-medium text-[#5F493B] transition hover:bg-[#F8F3ED] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
