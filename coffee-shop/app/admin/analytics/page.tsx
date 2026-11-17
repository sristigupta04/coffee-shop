
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  IndianRupee,
  ShoppingBag,
  Users,
  Package,
  TrendingUp,
  RefreshCw,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";

import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";

type AnalyticsSummary = {
  revenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  newCustomers: number;
  totalCustomers?: number;
  totalProducts: number;
  lowStockProducts: number;
};

type AnalyticsOrder = {
  id: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  user?: {
    name: string | null;
    email: string;
  } | null;
};

type TopProduct = {
  id: string;
  name: string;
  image: string;
  quantitySold: number;
  price: number;
};

type AnalyticsData = {
  summary: AnalyticsSummary;
  recentOrders: AnalyticsOrder[];
  topSellingProducts: TopProduct[];
  period?: {
    from: string;
    to: string;
  };
};

type AnalyticsResponse = {
  success: boolean;
  message?: string;
  data?: AnalyticsData;
};

const currency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const numberFormat = (value: number) =>
  value.toLocaleString("en-IN");

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return formatDateInput(date);
  });

  const [toDate, setToDate] = useState(() =>
    formatDateInput(new Date())
  );

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!fromDate || !toDate) {
        throw new Error("Please select both dates.");
      }

      if (fromDate > toDate) {
        throw new Error("Start date cannot be after end date.");
      }

      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
      });

      const response = await fetch(
        `/api/admin/analytics?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result: AnalyticsResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message || "Unable to load analytics."
        );
      }

      setAnalytics(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const summary = analytics?.summary;

  const orderStatuses = [
    {
      label: "Pending",
      value: summary?.pendingOrders ?? 0,
      color: "bg-amber-500",
    },
    {
      label: "Completed",
      value: summary?.completedOrders ?? 0,
      color: "bg-emerald-500",
    },
    {
      label: "Cancelled",
      value: summary?.cancelledOrders ?? 0,
      color: "bg-red-500",
    },
  ];

  const maxProductQuantity = Math.max(
    1,
    ...(analytics?.topSellingProducts ?? []).map(
      (product) => product.quantitySold
    )
  );

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* Heading */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#A76535]">
              BREWB​ITES ADMINISTRATION
            </p>

            <h1 className="mt-1 text-2xl font-bold text-[#2B1B14] sm:text-3xl">
              Business Analytics
            </h1>

            <p className="mt-1 text-sm text-[#80695B]">
              Track revenue, orders, customers and product performance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2B1B14] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#754426] disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Date filters */}
        <section className="rounded-2xl border border-[#E9DCCF] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-[#754426]" />
            <h2 className="font-semibold text-[#2B1B14]">
              Analytics Period
            </h2>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="fromDate"
                className="mb-1.5 block text-sm font-medium text-[#80695B]"
              >
                From Date
              </label>

              <input
                id="fromDate"
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full rounded-xl border border-[#E9DCCF] bg-[#FFFCF9] px-3 py-2.5 text-sm text-[#2B1B14] outline-none focus:border-[#A76535]"
              />
            </div>

            <div className="flex-1">
              <label
                htmlFor="toDate"
                className="mb-1.5 block text-sm font-medium text-[#80695B]"
              >
                To Date
              </label>

              <input
                id="toDate"
                type="date"
                value={toDate}
                min={fromDate}
                max={formatDateInput(new Date())}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full rounded-xl border border-[#E9DCCF] bg-[#FFFCF9] px-3 py-2.5 text-sm text-[#2B1B14] outline-none focus:border-[#A76535]"
              />
            </div>

            <button
              type="button"
              onClick={() => void loadAnalytics()}
              disabled={loading}
              className="rounded-xl bg-[#754426] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5C351D] disabled:opacity-60"
            >
              Apply Filter
            </button>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertTriangle size={19} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Analytics could not be loaded</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Summary cards */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Activity size={18} className="text-[#754426]" />
            <h2 className="font-semibold text-[#2B1B14]">
              Performance Overview
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Revenue"
              value={summary ? currency(summary.revenue) : "—"}
              icon={IndianRupee}
              loading={loading}
              description="Paid orders"
              iconColor="#754426"
              iconBackground="#F5E9DF"
            />

            <StatCard
              title="Total Orders"
              value={
                summary
                  ? numberFormat(summary.totalOrders)
                  : "—"
              }
              icon={ShoppingBag}
              loading={loading}
              description="Orders in selected period"
              iconColor="#2563EB"
              iconBackground="#EEF4FF"
            />

            <StatCard
              title="Total Customers"
              value={
                summary?.totalCustomers !== undefined
                  ? numberFormat(summary.totalCustomers)
                  : "—"
              }
              icon={Users}
              loading={loading}
              description="All registered customers"
              iconColor="#16835D"
              iconBackground="#E8F5EE"
            />

            <StatCard
              title="Total Products"
              value={
                summary
                  ? numberFormat(summary.totalProducts)
                  : "—"
              }
              icon={Package}
              loading={loading}
              description="Products in catalogue"
              iconColor="#A76535"
              iconBackground="#F5E9DF"
            />
          </div>
        </section>

        {/* Order status */}
        <section className="rounded-2xl border border-[#E9DCCF] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <TrendingUp size={19} className="text-[#754426]" />
            <div>
              <h2 className="font-bold text-[#2B1B14]">
                Order Status Overview
              </h2>
              <p className="text-xs text-[#80695B]">
                Orders grouped by current status
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {orderStatuses.map((item) => {
              const total = summary?.totalOrders ?? 0;
              const percentage =
                total > 0 ? (item.value / total) * 100 : 0;

              return (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-[#5F493B]">
                      {item.label}
                    </span>

                    <span className="text-sm font-semibold text-[#2B1B14]">
                      {loading ? "—" : numberFormat(item.value)}
                      {!loading && (
                        <span className="ml-2 text-xs font-normal text-[#A18B7C]">
                          ({percentage.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-[#F1E9E2]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{
                        width: `${Math.min(100, percentage)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Top selling products */}
        <section className="rounded-2xl border border-[#E9DCCF] bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#2B1B14]">
              Top Selling Products
            </h2>
            <p className="text-sm text-[#80695B]">
              Best-performing products by units sold.
            </p>
          </div>

          {loading ? (
            <div className="space-y-5">
              {[1, 2, 3].map((item) => (
                <div key={item} className="animate-pulse">
                  <div className="mb-2 h-4 w-1/3 rounded bg-[#F1E9E2]" />
                  <div className="h-2.5 rounded-full bg-[#F1E9E2]" />
                </div>
              ))}
            </div>
          ) : analytics?.topSellingProducts.length ? (
            <div className="space-y-5">
              {analytics.topSellingProducts.map((product, index) => {
                const percentage =
                  (product.quantitySold / maxProductQuantity) * 100;

                return (
                  <div key={product.id}>
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F5E9DF] text-sm font-bold text-[#754426]">
                          {index + 1}
                        </span>

                        <div>
                          <p className="font-semibold text-[#2B1B14]">
                            {product.name}
                          </p>
                          <p className="text-xs text-[#80695B]">
                            {numberFormat(product.quantitySold)} units sold
                          </p>
                        </div>
                      </div>

                      <p className="text-sm font-bold text-[#754426]">
                        {currency(
                          product.quantitySold * product.price
                        )}
                      </p>
                    </div>

                    <div className="ml-11 h-2 overflow-hidden rounded-full bg-[#F1E9E2]">
                      <div
                        className="h-full rounded-full bg-[#A76535] transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Package
                size={35}
                className="mx-auto mb-3 text-[#C6AA96]"
              />
              <p className="font-semibold text-[#5F493B]">
                No product sales data
              </p>
              <p className="mt-1 text-sm text-[#A18B7C]">
                Product sales will appear here once orders are placed.
              </p>
            </div>
          )}
        </section>

        {/* Recent orders */}
        <section className="rounded-2xl border border-[#E9DCCF] bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#2B1B14]">
              Recent Orders
            </h2>
            <p className="text-sm text-[#80695B]">
              Latest orders from the selected period.
            </p>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-[#80695B]">
              Loading recent orders...
            </p>
          ) : analytics?.recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E9DCCF] text-xs uppercase tracking-wide text-[#80695B]">
                    <th className="px-3 py-3">Order ID</th>
                    <th className="px-3 py-3">Customer</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Payment</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {analytics.recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[#F1E9E2] last:border-0 hover:bg-[#FFFCF9]"
                    >
                      <td className="px-3 py-4 font-semibold text-[#754426]">
                        #{order.id.slice(-8).toUpperCase()}
                      </td>

                      <td className="px-3 py-4 text-[#5F493B]">
                        {order.user?.name ||
                          order.user?.email ||
                          "Guest Customer"}
                      </td>

                      <td className="px-3 py-4 font-semibold text-[#2B1B14]">
                        {currency(Number(order.totalPrice) || 0)}
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge status={order.paymentStatus} />
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="px-3 py-4 whitespace-nowrap text-[#80695B]">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center">
              <ShoppingBag
                size={35}
                className="mx-auto mb-3 text-[#C6AA96]"
              />
              <p className="font-semibold text-[#5F493B]">
                No recent orders
              </p>
              <p className="mt-1 text-sm text-[#A18B7C]">
                Orders will appear here when customers place them.
              </p>
            </div>
          )}
        </section>

        {/* Inventory warning */}
        {summary && summary.lowStockProducts > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle
              size={20}
              className="mt-0.5 shrink-0 text-amber-700"
            />
            <div>
              <p className="font-semibold text-amber-900">
                Low stock alert
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {summary.lowStockProducts} products have stock at or below
                the low-stock threshold.
              </p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
