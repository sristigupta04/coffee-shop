
"use client";

import { useCallback, useEffect, useState } from "react";

type AlertProduct = {
  id: string;
  name: string;
  image: string;
  stock: number;
  price: number;
  alertType: "LOW_STOCK" | "OUT_OF_STOCK";
  recommendedRestock: number;
  category: {
    id: string;
    name: string;
  };
  updatedAt: string;
};

type AlertSummary = {
  totalAlerts: number;
  outOfStock: number;
  lowStock: number;
};

export default function InventoryAlertsPage() {
  const [alerts, setAlerts] = useState<AlertProduct[]>([]);
  const [summary, setSummary] = useState<AlertSummary>({
    totalAlerts: 0,
    outOfStock: 0,
    lowStock: 0,
  });

  const [threshold, setThreshold] = useState(10);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/inventory/alerts?threshold=${threshold}`,
        {
          credentials: "include",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load alerts.");
      }

      setAlerts(result.alerts ?? []);
      setSummary(result.summary);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const filteredAlerts = alerts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.name.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "ALL" ||
      product.alertType === filter;

    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

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
            <a
              href="/admin/inventory"
              className="rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm font-semibold hover:bg-[#FDF9F5]"
            >
              ← Inventory
            </a>

            <a
              href="/admin/inventory/history"
              className="rounded-xl bg-[#754426] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2B1B14]"
            >
              Stock History →
            </a>
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
            description="Products below threshold"
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
              <label
                htmlFor="threshold"
                className="text-sm font-medium"
              >
                Alert below:
              </label>

              <select
                id="threshold"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm outline-none focus:border-[#A76535]"
              >
                <option value={5}>5 units</option>
                <option value={10}>10 units</option>
                <option value={15}>15 units</option>
                <option value={20}>20 units</option>
                <option value={30}>30 units</option>
                <option value={50}>50 units</option>
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or category..."
              className="rounded-xl border border-[#EADED4] px-4 py-3 text-sm outline-none focus:border-[#A76535]"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
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
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              onClick={fetchAlerts}
              className="ml-3 font-bold underline"
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
              onClick={fetchAlerts}
              disabled={loading}
              className="rounded-lg border border-[#EADED4] px-3 py-2 text-sm font-semibold hover:bg-[#F8F3ED] disabled:opacity-50"
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#EADED4] border-t-[#754426]" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <span className="text-4xl">✓</span>
              <h3 className="mt-3 font-bold">
                No stock alerts found
              </h3>
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
                              <p className="font-semibold">
                                {product.name}
                              </p>
                              <p className="mt-1 text-xs text-[#80695B]">
                                {formatCurrency(product.price)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-[#80695B]">
                          {product.category.name}
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
                          <a
                            href={`/admin/inventory?productId=${encodeURIComponent(product.id)}`}
                            className="inline-flex whitespace-nowrap rounded-lg bg-[#754426] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2B1B14]"
                          >
                            Manage Stock →
                          </a>
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

// ==========================================
// SUMMARY CARD
// ==========================================

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
        <p className="text-sm font-medium text-[#80695B]">
          {title}
        </p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F3ED] text-xl font-bold text-[#754426]">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tabular-nums">
        {value.toLocaleString("en-IN")}
      </p>

      <p className="mt-1 text-xs text-[#80695B]">
        {description}
      </p>
    </div>
  );
}
