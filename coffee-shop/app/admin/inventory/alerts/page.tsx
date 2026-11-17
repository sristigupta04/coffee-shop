
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type AlertProduct = {
  id: string;
  name: string;
  image: string | null;
  stock: number;
  price: number | string;
  alertType: "LOW_STOCK" | "OUT_OF_STOCK";
  recommendedRestock: number;
  category: {
    id: string;
    name: string;
  } | null;
  updatedAt: string;
};

type AlertSummary = {
  totalAlerts: number;
  outOfStock: number;
  lowStock: number;
};

const EMPTY_SUMMARY: AlertSummary = {
  totalAlerts: 0,
  outOfStock: 0,
  lowStock: 0,
};

const THRESHOLD_OPTIONS = [5, 10, 15, 20, 30, 50];

export default function InventoryAlertsPage() {
  const [alerts, setAlerts] = useState<AlertProduct[]>([]);
  const [summary, setSummary] = useState<AlertSummary>(EMPTY_SUMMARY);
  const [threshold, setThreshold] = useState(10);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAlerts = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/inventory/alerts?threshold=${threshold}`,
        {
          credentials: "include",
          cache: "no-store",
          signal,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load inventory alerts.");
      }

      setAlerts(Array.isArray(result.alerts) ? result.alerts : []);
      setSummary({
        totalAlerts: Number(result.summary?.totalAlerts ?? 0),
        outOfStock: Number(result.summary?.outOfStock ?? 0),
        lowStock: Number(result.summary?.lowStock ?? 0),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading alerts."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [threshold]);

  useEffect(() => {
    const controller = new AbortController();

    fetchAlerts(controller.signal);

    return () => controller.abort();
  }, [fetchAlerts, refreshKey]);

  const filteredAlerts = alerts.filter((product) => {
    const searchTerm = search.trim().toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm) ||
      (product.category?.name ?? "").toLowerCase().includes(searchTerm);

    const matchesFilter =
      filter === "ALL" || product.alertType === filter;

    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number | string) => {
    const value = Number(amount);

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  };

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const refreshAlerts = () => {
    setRefreshKey((current) => current + 1);
  };

  return (
    <div className="min-h-screen bg-[#F8F3ED] px-4 py-6 text-[#2B1B14] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A76535]">
              BrewBites / Inventory
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Low Stock Alerts
            </h1>

            <p className="mt-2 text-sm text-[#80695B]">
              Monitor products that need restocking.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/inventory"
              className="rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm font-semibold hover:bg-[#FDF9F5]"
            >
              ← Inventory
            </Link>

            <Link
              href="/admin/inventory/history"
              className="rounded-xl bg-[#754426] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2B1B14]"
            >
              Stock History →
            </Link>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total Alerts"
            value={summary.totalAlerts}
            description="Products requiring attention"
            icon="⚠"
          />

          <SummaryCard
            title="Out of Stock"
            value={summary.outOfStock}
            description="Products with zero stock"
            icon="!"
          />

          <SummaryCard
            title="Low Stock"
            value={summary.lowStock}
            description="Products above zero but at or below threshold"
            icon="↓"
          />
        </div>

        {/* SETTINGS */}
        <section className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold">Stock Alert Settings</h2>
              <p className="mt-1 text-sm text-[#80695B]">
                Set the minimum stock level for alerts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="threshold" className="text-sm font-medium">
                Alert at or below:
              </label>

              <select
                id="threshold"
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                className="rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm outline-none focus:border-[#A76535]"
              >
                {THRESHOLD_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} units
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-[#F8F3ED] p-3 text-sm text-[#80695B]">
            Products with stock at or below {threshold} units will appear here.
            Recommended restock brings stock to {threshold * 2} units.
          </div>
        </section>

        {/* FILTERS */}
        <section className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product or category..."
              aria-label="Search product or category"
              className="rounded-xl border border-[#EADED4] px-4 py-3 text-sm outline-none focus:border-[#A76535]"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter inventory alerts"
              className="rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm outline-none focus:border-[#A76535]"
            >
              <option value="ALL">All Alerts</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
            </select>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={refreshAlerts}
              className="mt-2 font-bold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* PRODUCT TABLE */}
        <section className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#EADED4] px-5 py-4">
            <div>
              <h2 className="font-bold">Products Requiring Attention</h2>
              <p className="mt-1 text-sm text-[#80695B]">
                {filteredAlerts.length} products found
              </p>
            </div>

            <button
              type="button"
              onClick={refreshAlerts}
              disabled={loading}
              className="rounded-lg border border-[#EADED4] px-3 py-2 text-sm font-semibold hover:bg-[#F8F3ED] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div
                className="h-9 w-9 animate-spin rounded-full border-4 border-[#EADED4] border-t-[#754426]"
                role="status"
                aria-label="Loading inventory alerts"
              />
            </div>
          ) : error ? (
            <div className="flex min-h-48 items-center justify-center px-5 text-center text-sm text-[#80695B]">
              Unable to display inventory alerts. Please retry.
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <span className="text-4xl">✓</span>
              <h3 className="mt-3 font-bold">No stock alerts found</h3>
              <p className="mt-2 text-sm text-[#80695B]">
                No products match your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-[#FDF9F5] text-xs uppercase tracking-wider text-[#80695B]">
                  <tr>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Current Stock</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Restock Suggestion</th>
                    <th className="px-5 py-4">Last Updated</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#F0E8E0]">
                  {filteredAlerts.map((product) => {
                    const isOutOfStock = product.stock === 0;

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-[#FDF9F5]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-11 w-11 rounded-lg border border-[#EADED4] object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F8F3ED]">
                                ☕
                              </div>
                            )}

                            <div>
                              <p className="font-semibold">{product.name}</p>
                              <p className="mt-1 text-xs text-[#80695B]">
                                {formatCurrency(product.price)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-[#80695B]">
                          {product.category?.name ?? "Uncategorized"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-lg font-bold tabular-nums">
                            {product.stock}
                          </span>
                          <span className="ml-1 text-xs text-[#80695B]">
                            units
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                              isOutOfStock
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-amber-200 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {isOutOfStock ? "Out of Stock" : "Low Stock"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-bold text-[#754426]">
                            +{product.recommendedRestock}
                          </span>
                          <p className="mt-1 text-xs text-[#80695B]">
                            Suggested units
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-[#80695B]">
                          {formatDate(product.updatedAt)}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/inventory?productId=${encodeURIComponent(product.id)}`}
                            className="inline-flex whitespace-nowrap rounded-lg bg-[#754426] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2B1B14]"
                          >
                            Manage Stock →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="rounded-xl border border-[#EADED4] bg-white p-4 text-sm text-[#80695B]">
          <strong className="text-[#2B1B14]">Note:</strong>{" "}
          Restock suggestions are estimates based on your selected threshold.
          They do not automatically create purchase orders or update stock.
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#80695B]">{title}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F3ED] text-xl font-bold text-[#754426]">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tabular-nums">
        {value.toLocaleString("en-IN")}
      </p>

      <p className="mt-1 text-xs text-[#80695B]">{description}</p>
    </div>
  );
}
