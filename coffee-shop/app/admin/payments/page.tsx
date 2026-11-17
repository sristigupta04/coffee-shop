
"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Wallet,
  IndianRupee,
  RefreshCcw,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CreditCard,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";

type NumericValue = number | string | null;

type Payment = {
  id: string;
  totalPrice: NumericValue;
  paymentWay: string;
  paymentStatus: string;
  refundStatus: string | null;
  refundId: string | null;
  refundAmount: NumericValue;
  refundReason: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  items: {
    id: string;
    quantity: number;
    price: NumericValue;
  }[];
};

type Summary = {
  totalTransactions: number;
  paidCount: number;
  pendingCount: number;
  verifyingCount: number;
  refundingCount: number;
  refundedCount: number;
  failedRefundCount: number;
  grossRevenue: NumericValue;
  totalRefunded: NumericValue;
  netRevenue: NumericValue;
};

type Pagination = {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const initialSummary: Summary = {
  totalTransactions: 0,
  paidCount: 0,
  pendingCount: 0,
  verifyingCount: 0,
  refundingCount: 0,
  refundedCount: 0,
  failedRefundCount: 0,
  grossRevenue: 0,
  totalRefunded: 0,
  netRevenue: 0,
};

const initialPagination: Pagination = {
  page: 1,
  limit: 10,
  totalRecords: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

function formatCurrency(value: NumericValue) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0) || 0);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string | null }) {
  const normalizedStatus = status || "NOT_REQUESTED";

  const styles: Record<string, string> = {
    PAID: "bg-green-100 text-green-700",
    REFUNDED: "bg-purple-100 text-purple-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    VERIFYING: "bg-blue-100 text-blue-700",
    REFUNDING: "bg-orange-100 text-orange-700",
    PROCESSED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    NOT_REQUESTED: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[normalizedStatus] || "bg-gray-100 text-gray-600"
      }`}
    >
      {normalizedStatus.replaceAll("_", " ")}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <h3 className="mt-2 break-words text-2xl font-bold text-gray-900">
            {value}
          </h3>
        </div>

        <div className={`shrink-0 rounded-xl p-3 ${iconColor}`}>
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        {description}
      </p>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [pagination, setPagination] =
    useState<Pagination>(initialPagination);

  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("ALL");
  const [refundStatus, setRefundStatus] = useState("ALL");
  const [paymentWay, setPaymentWay] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestController = useRef<AbortController | null>(null);

  const fetchPayments = useCallback(
    async (page = 1) => {
      requestController.current?.abort();

      const controller = new AbortController();
      requestController.current = controller;

      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: String(Math.max(1, page)),
          limit: "10",
          search: search.trim(),
          paymentStatus,
          refundStatus,
          paymentWay,
        });

        if (from) params.set("from", from);
        if (to) params.set("to", to);

        const response = await fetch(
          `/api/admin/payments?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load payments."
          );
        }

        if (controller.signal.aborted) return;

        setPayments(
          Array.isArray(result.data) ? result.data : []
        );

        setSummary({
          ...initialSummary,
          ...(result.summary || {}),
        });

        setPagination(
          result.pagination || initialPagination
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [
      search,
      paymentStatus,
      refundStatus,
      paymentWay,
      from,
      to,
    ]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      void fetchPayments(1);
    }, 350);

    return () => {
      clearTimeout(timeout);
      requestController.current?.abort();
    };
  }, [fetchPayments]);

  const resetFilters = () => {
    setSearch("");
    setPaymentStatus("ALL");
    setRefundStatus("ALL");
    setPaymentWay("ALL");
    setFrom("");
    setTo("");
  };

  const statusOverview = [
    {
      label: "Paid",
      value: summary.paidCount,
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      label: "Pending",
      value: summary.pendingCount,
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Verifying",
      value: summary.verifyingCount,
      icon: Loader2,
      color: "text-blue-600",
    },
    {
      label: "Refunding",
      value: summary.refundingCount,
      icon: RefreshCcw,
      color: "text-orange-600",
    },
    {
      label: "Failed Refunds",
      value: summary.failedRefundCount,
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Payments & Refunds
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Monitor payment records, revenue and refund activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchPayments(pagination.page)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCcw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Gross Revenue"
          value={formatCurrency(summary.grossRevenue)}
          description={`${summary.paidCount + summary.refundedCount} successful payments · All time`}
          icon={IndianRupee}
          iconColor="bg-green-100 text-green-700"
        />

        <StatCard
          title="Net Revenue"
          value={formatCurrency(summary.netRevenue)}
          description="After processed refunds · All time"
          icon={Wallet}
          iconColor="bg-blue-100 text-blue-700"
        />

        <StatCard
          title="Total Refunded"
          value={formatCurrency(summary.totalRefunded)}
          description={`${summary.refundedCount} refunded payments`}
          icon={RotateCcw}
          iconColor="bg-purple-100 text-purple-700"
        />

        <StatCard
          title="Payment Records"
          value={summary.totalTransactions.toLocaleString("en-IN")}
          description={`${summary.pendingCount} payments pending · All time`}
          icon={CreditCard}
          iconColor="bg-orange-100 text-orange-700"
        />
      </div>

      {/* Payment Status Overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {statusOverview.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center gap-2">
              <item.icon size={17} className={item.color} />

              <span className="text-xs font-medium text-gray-500">
                {item.label}
              </span>
            </div>

            <p className="mt-2 text-xl font-bold text-gray-900">
              {item.value.toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">
              Payment Records
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Search and filter individual payment records.
            </p>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="text-left text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            Reset filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">

          {/* Search */}
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order, customer, payment ID..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Payment Status */}
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            aria-label="Filter payment status"
          >
            <option value="ALL">All payment statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFYING">Verifying</option>
            <option value="PAID">Paid</option>
            <option value="REFUNDING">Refunding</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          {/* Refund Status */}
          <select
            value={refundStatus}
            onChange={(e) => setRefundStatus(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            aria-label="Filter refund status"
          >
            <option value="ALL">All refund statuses</option>
            <option value="NOT_REQUESTED">Not requested</option>
            <option value="REFUNDING">Refunding</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSED">Processed</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Payment Method */}
          <select
            value={paymentWay}
            onChange={(e) => setPaymentWay(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            aria-label="Filter payment method"
          >
            <option value="ALL">All payment methods</option>
            <option value="ONLINE">Online / Razorpay</option>
            <option value="RAZORPAY">Razorpay</option>
            <option value="COD">Cash on Delivery</option>
          </select>

          {/* From Date */}
          <div className="relative">
            <CalendarDays
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
              aria-label="Start date"
            />
          </div>

          {/* To Date */}
          <div className="relative">
            <CalendarDays
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
              aria-label="End date"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <AlertCircle size={19} className="shrink-0" />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => fetchPayments(pagination.page)}
            className="font-semibold underline sm:ml-auto"
          >
            Retry
          </button>
        </div>
      )}

      {/* Payments Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-gray-900">
            Transaction Records
          </h2>

          <span className="text-xs text-gray-500">
            {pagination.totalRecords.toLocaleString("en-IN")} records found
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-5 py-4">Order / Date</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Payment</th>
                <th className="px-5 py-4">Refund</th>
                <th className="px-5 py-4">Refund Amount</th>
                <th className="px-5 py-4">Gateway IDs</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <Loader2
                      size={25}
                      className="mx-auto animate-spin text-blue-600"
                    />

                    <p className="mt-3 text-sm text-gray-500">
                      Loading payment records...
                    </p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <CreditCard
                      size={32}
                      className="mx-auto text-gray-300"
                    />

                    <p className="mt-3 font-semibold text-gray-700">
                      No payment records found
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Try changing your filters or search.
                    </p>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="transition hover:bg-gray-50"
                  >
                    {/* Order */}
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders/${payment.id}`}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        #{payment.id.slice(-8).toUpperCase()}
                      </Link>

                      <p className="mt-1 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(payment.createdAt)}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">
                        {payment.user?.name || "Guest Customer"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {payment.user?.email || "No email"}
                      </p>
                    </td>

                    {/* Payment Method */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-gray-700">
                        <CreditCard size={15} />

                        {payment.paymentWay || "Not specified"}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {formatCurrency(payment.totalPrice)}
                    </td>

                    {/* Payment Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={payment.paymentStatus} />
                    </td>

                    {/* Refund Status */}
                    <td className="px-5 py-4">
                      <StatusBadge status={payment.refundStatus} />
                    </td>

                    {/* Refund Amount */}
                    <td className="px-5 py-4 font-medium text-gray-700">
                      {payment.refundAmount !== null
                        ? formatCurrency(payment.refundAmount)
                        : "—"}
                    </td>

                    {/* Gateway IDs */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p
                          className="max-w-[190px] truncate text-xs text-gray-600"
                          title={payment.razorpayPaymentId || ""}
                        >
                          Payment: {payment.razorpayPaymentId || "—"}
                        </p>

                        <p
                          className="max-w-[190px] truncate text-xs text-gray-500"
                          title={payment.razorpayOrderId || ""}
                        >
                          Order: {payment.razorpayOrderId || "—"}
                        </p>

                        {payment.refundId && (
                          <p
                            className="max-w-[190px] truncate text-xs text-purple-600"
                            title={payment.refundId}
                          >
                            Refund: {payment.refundId}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Showing{" "}
            {pagination.totalRecords === 0
              ? 0
              : (pagination.page - 1) * pagination.limit + 1}{" "}
            to{" "}
            {Math.min(
              pagination.page * pagination.limit,
              pagination.totalRecords
            )}{" "}
            of {pagination.totalRecords} records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                fetchPayments(pagination.page - 1)
              }
              disabled={!pagination.hasPreviousPage || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <span className="px-2 text-sm font-medium text-gray-700">
              {pagination.page} / {Math.max(pagination.totalPages, 1)}
            </span>

            <button
              type="button"
              onClick={() =>
                fetchPayments(pagination.page + 1)
              }
              disabled={!pagination.hasNextPage || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
