
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Package,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  isAvailable: boolean;
  category: {
    id: string;
    name: string;
  };
};

type InventorySummary = {
  totalProducts: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
  inventoryValue: number;
  lowStockLimit: number;
};

type StockAction = "ADD" | "REMOVE" | "SET";
type StockFilter = "ALL" | "IN_STOCK" | "LOW" | "OUT";
type AvailabilityFilter = "ALL" | "AVAILABLE" | "UNAVAILABLE";

const emptySummary: InventorySummary = {
  totalProducts: 0,
  totalStock: 0,
  lowStock: 0,
  outOfStock: 0,
  inventoryValue: 0,
  lowStockLimit: 10,
};

async function readResponse(response: Response) {
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message || "Something went wrong. Please try again."
    );
  }

  return result;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] =
    useState<InventorySummary>(emptySummary);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("ALL");

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [action, setAction] = useState<StockAction>("ADD");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/inventory", {
        cache: "no-store",
      });

      const result = await readResponse(response);

      setProducts(
        Array.isArray(result.products) ? result.products : []
      );

      setSummary({
        ...emptySummary,
        ...(result.summary ?? {}),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load inventory."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const categories = useMemo(() => {
    const unique = new Map<string, string>();

    products.forEach((product) => {
      if (product.category?.id) {
        unique.set(product.category.id, product.category.name);
      }
    });

    return Array.from(unique.entries());
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category?.name.toLowerCase().includes(query) ||
        product.id.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "ALL" ||
        product.category?.id === categoryFilter;

      let matchesStock = true;

      if (stockFilter === "LOW") {
        matchesStock =
          product.stock > 0 &&
          product.stock <= summary.lowStockLimit;
      } else if (stockFilter === "OUT") {
        matchesStock = product.stock === 0;
      } else if (stockFilter === "IN_STOCK") {
        matchesStock = product.stock > summary.lowStockLimit;
      }

      const matchesAvailability =
        availabilityFilter === "ALL" ||
        (availabilityFilter === "AVAILABLE" && product.isAvailable) ||
        (availabilityFilter === "UNAVAILABLE" && !product.isAvailable);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock &&
        matchesAvailability
      );
    });
  }, [
    products,
    search,
    categoryFilter,
    stockFilter,
    availabilityFilter,
    summary.lowStockLimit,
  ]);

  function getStockStatus(stock: number) {
    if (stock === 0) {
      return {
        label: "Out of Stock",
        className: "bg-red-50 text-red-700",
      };
    }

    if (stock <= summary.lowStockLimit) {
      return {
        label: "Low Stock",
        className: "bg-amber-50 text-amber-700",
      };
    }

    return {
      label: "In Stock",
      className: "bg-green-50 text-green-700",
    };
  }

  function openAdjustment(product: Product) {
    setSelectedProduct(product);
    setAction("ADD");
    setQuantity("1");
    setReason("");
    setError("");
    setSuccess("");
  }

  function closeAdjustment() {
    if (saving) return;

    setSelectedProduct(null);
    setError("");
    setReason("");
  }

  async function handleAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) return;

    const amount = Number(quantity);

    if (
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      (action !== "SET" && amount === 0)
    ) {
      setError(
        action === "SET"
          ? "Enter a valid non-negative whole number."
          : "Enter a quantity greater than zero."
      );
      return;
    }

    if (action === "REMOVE" && amount > selectedProduct.stock) {
      setError("Insufficient stock. You cannot remove more than available.");
      return;
    }

    const calculatedStock =
      action === "ADD"
        ? selectedProduct.stock + amount
        : action === "REMOVE"
          ? selectedProduct.stock - amount
          : amount;

    if (
      !Number.isSafeInteger(calculatedStock) ||
      calculatedStock < 0 ||
      calculatedStock > 2_147_483_647
    ) {
      setError("The resulting stock quantity is outside the allowed range.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          action,
          quantity: amount,
          reason: reason.trim() || undefined,
        }),
      });

      await readResponse(response);

      setSelectedProduct(null);
      setReason("");
      setSuccess(
        `${selectedProduct.name} stock updated successfully.`
      );

      await fetchInventory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update stock."
      );
    } finally {
      setSaving(false);
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const inputClass =
    "w-full rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm text-[#2B1B14] outline-none transition placeholder:text-[#A99486] focus:border-[#754426] focus:ring-2 focus:ring-[#754426]/10 disabled:opacity-60";

  const summaryCards = [
    {
      title: "Total Products",
      value: summary.totalProducts,
      description: "Products in inventory",
      icon: Package,
    },
    {
      title: "Total Stock Units",
      value: summary.totalStock,
      description: "Current inventory quantity",
      icon: TrendingUp,
    },
    {
      title: "Low Stock",
      value: summary.lowStock,
      description: `1–${summary.lowStockLimit} units remaining`,
      icon: AlertCircle,
    },
    {
      title: "Out of Stock",
      value: summary.outOfStock,
      description: "Products with zero stock",
      icon: TrendingDown,
    },
  ];

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-[#A76535]">
              BREWB​ITES ADMIN
            </p>

            <h1 className="mt-2 text-2xl font-bold text-[#2B1B14] sm:text-3xl">
              Inventory Management
            </h1>

            <p className="mt-2 text-sm text-[#80695B]">
              Monitor products, manage stock and track inventory levels.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchInventory}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#EADED4] bg-white px-4 py-3 text-sm font-semibold text-[#754426] transition hover:bg-[#F4EAE0] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Inventory
          </button>
        </header>

        {/* Messages */}
        {error && !selectedProduct && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto"
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <CheckCircle2 size={19} />
            <p>{success}</p>
            <button
              type="button"
              onClick={() => setSuccess("")}
              className="ml-auto"
              aria-label="Dismiss success"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Summary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[#80695B]">
                    {card.title}
                  </p>

                  <div className="rounded-xl bg-[#F8F3ED] p-2.5 text-[#754426]">
                    <Icon size={19} />
                  </div>
                </div>

                <h2 className="mt-4 text-3xl font-bold text-[#2B1B14]">
                  {loading ? "—" : card.value.toLocaleString("en-IN")}
                </h2>

                <p className="mt-2 text-xs text-[#80695B]">
                  {card.description}
                </p>
              </div>
            );
          })}
        </section>

        {/* Inventory Value */}
        <section className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#80695B]">
            Estimated Inventory Value
          </p>

          <h2 className="mt-2 text-2xl font-bold text-[#754426]">
            {loading
              ? "Loading..."
              : formatCurrency(summary.inventoryValue)}
          </h2>

          <p className="mt-1 text-xs text-[#80695B]">
            Selling price × current stock. This is not purchase cost or
            accounting valuation.
          </p>
        </section>

        {/* Inventory Alert */}
        {!loading &&
          summary.lowStock + summary.outOfStock > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle
                  size={21}
                  className="mt-0.5 shrink-0 text-amber-700"
                />

                <div>
                  <h2 className="font-semibold text-amber-900">
                    Inventory Attention Required
                  </h2>

                  <p className="mt-1 text-sm text-amber-800">
                    {summary.lowStock} products have low stock and{" "}
                    {summary.outOfStock} products are out of stock.
                    Consider replenishing them.
                  </p>
                </div>
              </div>
            </section>
          )}

        {/* Inventory Table */}
        <section className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white shadow-sm">
          <div className="border-b border-[#EADED4] p-5 sm:p-6">
            <h2 className="text-lg font-bold text-[#2B1B14]">
              Product Stock Overview
            </h2>

            <p className="mt-1 text-sm text-[#80695B]">
              Search, filter and adjust product inventory.
            </p>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 border-b border-[#EADED4] p-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A99486]"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                className={`${inputClass} appearance-none pr-9`}
              >
                <option value="ALL">All Categories</option>

                {categories.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#80695B]"
              />
            </div>

            <div className="relative">
              <select
                value={stockFilter}
                onChange={(event) =>
                  setStockFilter(event.target.value as StockFilter)
                }
                className={`${inputClass} appearance-none pr-9`}
              >
                <option value="ALL">All Stock Status</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="LOW">Low Stock</option>
                <option value="OUT">Out of Stock</option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#80695B]"
              />
            </div>

            <div className="relative">
              <select
                value={availabilityFilter}
                onChange={(event) =>
                  setAvailabilityFilter(
                    event.target.value as AvailabilityFilter
                  )
                }
                className={`${inputClass} appearance-none pr-9`}
              >
                <option value="ALL">All Product Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#80695B]"
              />
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-14 text-[#80695B]">
              <Loader2 size={27} className="animate-spin" />
              <p className="text-sm">Loading inventory...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-14 text-center">
              <Package size={35} className="text-[#A99486]" />

              <h3 className="mt-4 font-semibold text-[#2B1B14]">
                No products found
              </h3>

              <p className="mt-1 text-sm text-[#80695B]">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-[#F8F3ED] text-xs uppercase tracking-wide text-[#80695B]">
                  <tr>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Price</th>
                    <th className="px-5 py-4">Stock</th>
                    <th className="px-5 py-4">Stock Status</th>
                    <th className="px-5 py-4">Availability</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EADED4]">
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product.stock);

                    return (
                      <tr
                        key={product.id}
                        className="transition hover:bg-[#F8F3ED]/60"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#F8F3ED]">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package
                                  size={19}
                                  className="text-[#A99486]"
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-[#2B1B14]">
                                {product.name}
                              </p>

                              <p className="mt-1 text-xs text-[#80695B]">
                                ID: {product.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-[#80695B]">
                          {product.category?.name ?? "Uncategorized"}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-[#2B1B14]">
                          {formatCurrency(product.price)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-bold text-[#2B1B14]">
                            {product.stock.toLocaleString("en-IN")}
                          </span>

                          <span className="ml-1 text-xs text-[#80695B]">
                            units
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              product.isAvailable
                                ? "bg-green-50 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {product.isAvailable
                              ? "Available"
                              : "Unavailable"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openAdjustment(product)}
                            disabled={!!selectedProduct || saving}
                            className="rounded-lg bg-[#754426] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2B1B14] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[#EADED4] px-5 py-4 text-xs text-[#80695B]">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </section>

        {/* Stock Adjustment Modal */}
        {selectedProduct && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !saving
              ) {
                closeAdjustment();
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="adjust-stock-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="adjust-stock-title"
                    className="text-xl font-bold text-[#2B1B14]"
                  >
                    Adjust Stock
                  </h2>

                  <p className="mt-1 text-sm text-[#80695B]">
                    {selectedProduct.name}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={closeAdjustment}
                  aria-label="Close modal"
                  className="rounded-lg p-1 text-[#80695B] transition hover:bg-[#F8F3ED] hover:text-[#2B1B14] disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-5 rounded-xl bg-[#F8F3ED] p-4">
                <p className="text-xs text-[#80695B]">
                  Current Stock
                </p>

                <p className="mt-1 text-2xl font-bold text-[#754426]">
                  {selectedProduct.stock.toLocaleString("en-IN")} units
                </p>

                <p className="mt-1 text-xs text-[#80695B]">
                  {selectedProduct.category?.name ?? "Uncategorized"}
                </p>
              </div>

              <form
                onSubmit={handleAdjustment}
                className="mt-5 space-y-4"
              >
                <div>
                  <label
                    htmlFor="stockAction"
                    className="mb-2 block text-sm font-semibold text-[#2B1B14]"
                  >
                    Adjustment Type
                  </label>

                  <select
                    id="stockAction"
                    value={action}
                    onChange={(event) =>
                      setAction(event.target.value as StockAction)
                    }
                    disabled={saving}
                    className={inputClass}
                  >
                    <option value="ADD">Add Stock</option>
                    <option value="REMOVE">Remove Stock</option>
                    <option value="SET">Set Exact Stock</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="mb-2 block text-sm font-semibold text-[#2B1B14]"
                  >
                    {action === "SET"
                      ? "New Stock Quantity"
                      : "Quantity"}
                  </label>

                  <input
                    id="quantity"
                    type="number"
                    min={action === "SET" ? 0 : 1}
                    max={2_147_483_647}
                    step="1"
                    required
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    disabled={saving}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="reason"
                    className="mb-2 block text-sm font-semibold text-[#2B1B14]"
                  >
                    Reason
                    <span className="ml-1 font-normal text-[#A99486]">
                      (Optional)
                    </span>
                  </label>

                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(event) =>
                      setReason(event.target.value)
                    }
                    maxLength={500}
                    rows={2}
                    disabled={saving}
                    placeholder="e.g. New stock received, damaged items..."
                    className={inputClass}
                  />

                  <p className="mt-1 text-right text-xs text-[#A99486]">
                    {reason.length}/500
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeAdjustment}
                    className="flex-1 rounded-xl border border-[#EADED4] px-4 py-3 text-sm font-semibold text-[#754426] transition hover:bg-[#F8F3ED] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#754426] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2B1B14] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving && (
                      <Loader2 size={16} className="animate-spin" />
                    )}

                    {saving ? "Updating..." : "Confirm Update"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
