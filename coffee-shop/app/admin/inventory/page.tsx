
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

const emptySummary: InventorySummary = {
  totalProducts: 0,
  totalStock: 0,
  lowStock: 0,
  outOfStock: 0,
  inventoryValue: 0,
  lowStockLimit: 10,
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] =
    useState<InventorySummary>(emptySummary);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [stockFilter, setStockFilter] = useState("ALL");

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [action, setAction] = useState<StockAction>("ADD");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/inventory", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load inventory."
        );
      }

      setProducts(result.products ?? []);
      setSummary(result.summary ?? emptySummary);
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

  // Unique categories
  const categories = useMemo(() => {
    return Array.from(
      new Map(
        products.map((product) => [
          product.category.id,
          product.category.name,
        ])
      ).entries()
    );
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.category.name.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "ALL" ||
        product.category.id === categoryFilter;

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

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, search, categoryFilter, stockFilter, summary.lowStockLimit]);

  // Stock status
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

  // Open adjustment modal
  function openAdjustment(product: Product) {
    setSelectedProduct(product);
    setAction("ADD");
    setQuantity("1");
    setError("");
    setSuccess("");
  }

  // Submit stock adjustment
  async function handleAdjustment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedProduct) return;

    const amount = Number(quantity);

    if (
      !Number.isInteger(amount) ||
      amount < 0 ||
      (action !== "SET" && amount === 0)
    ) {
      setError("Enter a valid stock quantity.");
      return;
    }

    if (action === "REMOVE" && amount > selectedProduct.stock) {
      setError("Insufficient stock.");
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
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Stock adjustment failed."
        );
      }

      setSelectedProduct(null);
      setSuccess("Stock updated successfully.");

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
      maximumFractionDigits: 0,
    }).format(value);

  const inputClass =
    "w-full rounded-lg border border-[#EADED4] bg-white px-4 py-3 text-sm text-[#2B1B14] outline-none focus:border-[#754426] focus:ring-2 focus:ring-[#754426]/10";

  return (
    <main className="min-h-screen bg-[#F8F3ED] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wider text-[#A76535]">
              BREWB​ITES ADMIN
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#2B1B14]">
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
            className="rounded-lg border border-[#EADED4] bg-white px-5 py-3 text-sm font-semibold text-[#754426] transition hover:bg-[#F8F3ED] disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh Inventory"}
          </button>
        </header>

        {/* Messages */}
        {error && !selectedProduct && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        {/* Summary Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: "Total Products",
              value: summary.totalProducts,
              icon: "📦",
              description: "Products in inventory",
            },
            {
              title: "Total Stock Units",
              value: summary.totalStock,
              icon: "☕",
              description: "Available inventory quantity",
            },
            {
              title: "Low Stock",
              value: summary.lowStock,
              icon: "⚠️",
              description: `1–${summary.lowStockLimit} units remaining`,
            },
            {
              title: "Out of Stock",
              value: summary.outOfStock,
              icon: "🚫",
              description: "Products with zero stock",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[#EADED4] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#80695B]">
                  {card.title}
                </p>
                <span className="text-2xl">{card.icon}</span>
              </div>

              <h2 className="mt-3 text-3xl font-bold text-[#2B1B14]">
                {loading ? "—" : card.value.toLocaleString("en-IN")}
              </h2>

              <p className="mt-2 text-xs text-[#80695B]">
                {card.description}
              </p>
            </div>
          ))}
        </section>

        {/* Inventory Value */}
        <section className="rounded-2xl border border-[#EADED4] bg-white p-5">
          <p className="text-sm font-medium text-[#80695B]">
            Estimated Inventory Value
          </p>

          <h2 className="mt-2 text-2xl font-bold text-[#754426]">
            {loading ? "Loading..." : formatCurrency(summary.inventoryValue)}
          </h2>

          <p className="mt-1 text-xs text-[#80695B]">
            Calculated using product selling prices × current stock.
            This is not accounting cost value.
          </p>
        </section>

        {/* Low Stock Alert */}
        {!loading && summary.lowStock + summary.outOfStock > 0 && (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-900">
              ⚠ Inventory Attention Required
            </h2>

            <p className="mt-1 text-sm text-amber-800">
              {summary.lowStock} products have low stock and{" "}
              {summary.outOfStock} products are out of stock.
              Consider replenishing them.
            </p>
          </section>
        )}

        {/* Product Inventory Table */}
        <section className="overflow-hidden rounded-2xl border border-[#EADED4] bg-white shadow-sm">

          <div className="border-b border-[#EADED4] p-5">
            <h2 className="text-xl font-semibold text-[#2B1B14]">
              Product Stock Overview
            </h2>

            <p className="mt-1 text-sm text-[#80695B]">
              Search, filter and adjust product inventory.
            </p>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 gap-3 border-b border-[#EADED4] p-5 md:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className={inputClass}
            />

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={inputClass}
            >
              <option value="ALL">All Categories</option>

              {categories.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
              className={inputClass}
            >
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW">Low Stock</option>
              <option value="OUT">Out of Stock</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-12 text-center text-sm text-[#80695B]">
              Loading inventory...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-[#2B1B14]">
                No products found.
              </p>
              <p className="mt-1 text-sm text-[#80695B]">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-[#F8F3ED] text-xs uppercase tracking-wide text-[#80695B]">
                  <tr>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Price</th>
                    <th className="px-5 py-4">Stock</th>
                    <th className="px-5 py-4">Status</th>
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
                          <p className="font-semibold text-[#2B1B14]">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-[#80695B]">
                            ID: {product.id}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-[#80695B]">
                          {product.category.name}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-[#2B1B14]">
                          {formatCurrency(product.price)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-bold text-[#2B1B14]">
                            {product.stock}
                          </span>
                          <span className="ml-1 text-xs text-[#80695B]">
                            units
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => openAdjustment(product)}
                            className="rounded-lg bg-[#754426] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2B1B14]"
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
              if (event.target === event.currentTarget && !saving) {
                setSelectedProduct(null);
                setError("");
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
                  onClick={() => {
                    setSelectedProduct(null);
                    setError("");
                  }}
                  aria-label="Close modal"
                  className="text-xl text-[#80695B] hover:text-[#2B1B14] disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 rounded-xl bg-[#F8F3ED] p-4">
                <p className="text-xs text-[#80695B]">
                  Current Stock
                </p>
                <p className="mt-1 text-2xl font-bold text-[#754426]">
                  {selectedProduct.stock} units
                </p>
              </div>

              <form onSubmit={handleAdjustment} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="stockAction"
                    className="mb-2 block text-sm font-medium text-[#2B1B14]"
                  >
                    Adjustment Type
                  </label>

                  <select
                    id="stockAction"
                    value={action}
                    onChange={(event) =>
                      setAction(event.target.value as StockAction)
                    }
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
                    className="mb-2 block text-sm font-medium text-[#2B1B14]"
                  >
                    {action === "SET" ? "New Stock Quantity" : "Quantity"}
                  </label>

                  <input
                    id="quantity"
                    type="number"
                    min={action === "SET" ? 0 : 1}
                    step="1"
                    required
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className={inputClass}
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setSelectedProduct(null);
                      setError("");
                    }}
                    className="flex-1 rounded-lg border border-[#EADED4] px-4 py-3 text-sm font-semibold text-[#754426] hover:bg-[#F8F3ED] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-[#754426] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2B1B14] disabled:opacity-50"
                  >
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
