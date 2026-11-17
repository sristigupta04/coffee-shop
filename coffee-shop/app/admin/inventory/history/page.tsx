
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Movement = {
  id: string;
  type: "ADD" | "REMOVE" | "SET";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    image: string | null;
    price: number | string;
    category: {
      name: string;
    } | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

type Summary = {
  totalMovements: number;
  additions: number;
  removals: number;
  manualAdjustments: number;
  addedQuantity: number;
  removedQuantity: number;
};

type Pagination = {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

const initialSummary: Summary = {
  totalMovements: 0,
  additions: 0,
  removals: 0,
  manualAdjustments: 0,
  addedQuantity: 0,
  removedQuantity: 0,
};

const initialPagination: Pagination = {
  page: 1,
  pageSize: 20,
  totalRecords: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export default function InventoryHistoryPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [pagination, setPagination] =
    useState<Pagination>(initialPagination);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchHistory = useCallback(
    async (page: number, signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (type !== "ALL") {
          params.set("type", type);
        }

        if (from) {
          const startDate = new Date(`${from}T00:00:00`);

          if (Number.isNaN(startDate.getTime())) {
            throw new Error("Invalid start date.");
          }

          params.set("from", startDate.toISOString());
        }

        if (to) {
          const endDate = new Date(`${to}T23:59:59.999`);

          if (Number.isNaN(endDate.getTime())) {
            throw new Error("Invalid end date.");
          }

          params.set("to", endDate.toISOString());
        }

        const response = await fetch(
          `/api/admin/inventory/history?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load stock history."
          );
        }

        setMovements(
          Array.isArray(result.movements) ? result.movements : []
        );

        setSummary({
          totalMovements: Number(
            result.summary?.totalMovements ?? 0
          ),
          additions: Number(result.summary?.additions ?? 0),
          removals: Number(result.summary?.removals ?? 0),
          manualAdjustments: Number(
            result.summary?.manualAdjustments ?? 0
          ),
          addedQuantity: Number(
            result.summary?.addedQuantity ?? 0
          ),
          removedQuantity: Number(
            result.summary?.removedQuantity ?? 0
          ),
        });

        setPagination({
          page: Number(result.pagination?.page ?? page),
          pageSize: Number(result.pagination?.pageSize ?? 20),
          totalRecords: Number(
            result.pagination?.totalRecords ?? 0
          ),
          totalPages: Number(result.pagination?.totalPages ?? 0),
          hasNextPage: Boolean(
            result.pagination?.hasNextPage
          ),
          hasPreviousPage: Boolean(
            result.pagination?.hasPreviousPage
          ),
        });

        setCurrentPage(page);
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
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [search, type, from, to]
  );

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      fetchHistory(currentPage, controller.signal);
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchHistory, currentPage, refreshKey]);

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Not available";
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number | string) => {
    const value = Number(amount);

    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  };

  const getMovementStyle = (movementType: Movement["type"]) => {
    switch (movementType) {
      case "ADD":
        return {
          label: "Stock Added",
          color: "bg-green-50 text-green-700 border-green-200",
          sign: "+",
        };

      case "REMOVE":
        return {
          label: "Stock Removed",
          color: "bg-red-50 text-red-700 border-red-200",
          sign: "-",
        };

      default:
        return {
          label: "Stock Adjusted",
          color: "bg-blue-50 text-blue-700 border-blue-200",
          sign: "",
        };
    }
  };

  const clearFilters = () => {
    setSearch("");
    setType("ALL");
    setFrom("");
    setTo("");
    setCurrentPage(1);
  };

  const changePage = (page: number) => {
    if (page < 1 || page > pagination.totalPages || loading) {
      return;
    }

    setCurrentPage(page);
  };

  const refreshHistory = () => {
    setRefreshKey((value) => value + 1);
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

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Stock Movement History
            </h1>

            <p className="mt-2 text-sm text-[#80695B]">
              Track every stock addition, removal and manual adjustment.
            </p>
          </div>

          <Link
            href="/admin/inventory"
            className="inline-flex items-center justify-center rounded-xl border border-[#EADED4] bg-white px-5 py-3 text-sm font-semibold transition hover:bg-[#FDF9F5]"
          >
            ← Back to Inventory
          </Link>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Movements"
            value={summary.totalMovements}
            description="Recorded stock activities"
            symbol="↕"
          />

          <SummaryCard
            title="Stock Added"
            value={summary.addedQuantity}
            description={`${summary.additions} addition records`}
            symbol="+"
          />

          <SummaryCard
            title="Stock Removed"
            value={summary.removedQuantity}
            description={`${summary.removals} removal records`}
            symbol="−"
          />

          <SummaryCard
            title="Manual Adjustments"
            value={summary.manualAdjustments}
            description="SET operations"
            symbol="="
          />
        </div>

        {/* FILTERS */}
        <section className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold">Activity Records</h2>
              <p className="mt-1 text-sm text-[#80695B]">
                Search and filter stock movement records.
              </p>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-[#EADED4] px-4 py-2 text-sm font-semibold hover:bg-[#F8F3ED]"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search product, admin, reason..."
              aria-label="Search movement history"
              className="rounded-xl border border-[#EADED4] px-4 py-3 text-sm outline-none transition focus:border-[#A76535] focus:ring-2 focus:ring-[#A76535]/10"
            />

            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter movement type"
              className="rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm outline-none focus:border-[#A76535]"
            >
              <option value="ALL">All Actions</option>
              <option value="ADD">Stock Added</option>
              <option value="REMOVE">Stock Removed</option>
              <option value="SET">Stock Adjusted</option>
            </select>

            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setFrom(event.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter from date"
              className="rounded-xl border border-[#EADED4] px-4 py-3 text-sm outline-none focus:border-[#A76535]"
            />

            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter to date"
              className="rounded-xl border border-[#EADED4] px-4 py-3 text-sm outline-none focus:border-[#A76535]"
            />
          </div>
        </section>

        {/* HISTORY TABLE */}
        <section className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-[#EADED4] px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold">Movement Logs</h2>
              <p className="mt-1 text-sm text-[#80695B]">
                {pagination.totalRecords.toLocaleString("en-IN")} records found
              </p>
            </div>

            <button
              type="button"
              onClick={refreshHistory}
              disabled={loading}
              className="rounded-lg border border-[#EADED4] px-3 py-2 text-sm font-semibold hover:bg-[#F8F3ED] disabled:opacity-50"
            >
              ↻ Refresh
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={refreshHistory}
                className="mt-2 font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div
                className="h-9 w-9 animate-spin rounded-full border-4 border-[#EADED4] border-t-[#754426]"
                role="status"
                aria-label="Loading stock history"
              />
            </div>
          ) : error ? (
            <div className="flex min-h-40 items-center justify-center px-5 text-center text-sm text-[#80695B]">
              Unable to display movement records. Please retry.
            </div>
          ) : movements.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F8F3ED] text-2xl">
                📦
              </div>

              <h3 className="font-bold">
                No movement records found
              </h3>

              <p className="mt-2 max-w-sm text-sm text-[#80695B]">
                Stock changes will appear here once an admin adds,
                removes or adjusts product stock.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left">
                  <thead className="bg-[#FDF9F5] text-xs uppercase tracking-wider text-[#80695B]">
                    <tr>
                      <th className="px-5 py-4">Product</th>
                      <th className="px-5 py-4">Action</th>
                      <th className="px-5 py-4">Quantity</th>
                      <th className="px-5 py-4">Previous</th>
                      <th className="px-5 py-4">New Stock</th>
                      <th className="px-5 py-4">Admin</th>
                      <th className="px-5 py-4">Reason</th>
                      <th className="px-5 py-4">Date & Time</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F0E8E0]">
                    {movements.map((movement) => {
                      const style = getMovementStyle(movement.type);

                      return (
                        <tr
                          key={movement.id}
                          className="transition hover:bg-[#FDF9F5]"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {movement.product.image ? (
                                <img
                                  src={movement.product.image}
                                  alt={movement.product.name}
                                  className="h-11 w-11 rounded-lg border border-[#EADED4] object-cover"
                                />
                              ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F8F3ED]">
                                  ☕
                                </div>
                              )}

                              <div>
                                <p className="font-semibold">
                                  {movement.product.name}
                                </p>
                                <p className="mt-1 text-xs text-[#80695B]">
                                  {movement.product.category?.name ??
                                    "Uncategorized"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${style.color}`}
                            >
                              {style.label}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-semibold tabular-nums">
                            {style.sign}
                            {movement.quantity.toLocaleString("en-IN")}
                          </td>

                          <td className="px-5 py-4 text-[#80695B] tabular-nums">
                            {movement.previousStock.toLocaleString("en-IN")}
                          </td>

                          <td className="px-5 py-4 font-bold tabular-nums">
                            {movement.newStock.toLocaleString("en-IN")}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium">
                              {movement.user?.name || "Unknown Admin"}
                            </p>
                            <p className="mt-1 text-xs text-[#80695B]">
                              {movement.user?.email || "Admin"}
                            </p>
                          </td>

                          <td className="max-w-48 px-5 py-4 text-sm text-[#80695B]">
                            {movement.reason || "No reason provided"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-[#80695B]">
                            {formatDate(movement.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col justify-between gap-4 border-t border-[#EADED4] px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-sm text-[#80695B]">
                  Page {pagination.page} of{" "}
                  {Math.max(1, pagination.totalPages)}
                  {" · "}
                  {pagination.totalRecords.toLocaleString("en-IN")} total records
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!pagination.hasPreviousPage || loading}
                    onClick={() => changePage(pagination.page - 1)}
                    className="rounded-lg border border-[#EADED4] px-4 py-2 text-sm font-semibold transition hover:bg-[#F8F3ED] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={!pagination.hasNextPage || loading}
                    onClick={() => changePage(pagination.page + 1)}
                    className="rounded-lg bg-[#754426] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2B1B14] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* INFORMATION */}
        <div className="rounded-xl border border-[#EADED4] bg-white p-4">
          <p className="text-sm font-semibold">
            <span className="mr-2">🔒</span>
            Inventory Audit Log
          </p>
          <p className="mt-1 text-sm text-[#80695B]">
            Every recorded stock adjustment includes the previous stock,
            updated stock, admin identity, action and timestamp.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  symbol,
}: {
  title: string;
  value: number;
  description: string;
  symbol: string;
}) {
  return (
    <div className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#80695B]">
          {title}
        </p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8F3ED] text-lg font-bold text-[#754426]">
          {symbol}
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
