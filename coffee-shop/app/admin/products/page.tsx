
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  Package,
  Pencil,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from "lucide-react";

type ProductCategory =
  | string
  | {
      id?: string;
      name?: string;
    }
  | null;

type Product = {
  id: string;
  name: string;
  price: number | string;
  description?: string | null;
  image?: string | null;
  category?: ProductCategory;
  categoryId?: string | null;
  stock: number;
  isAvailable: boolean;
  createdAt?: string;
};

type AvailabilityFilter =
  | "ALL"
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "LOW_STOCK";

const PAGE_SIZE = 9;

function getCategoryName(
  category: ProductCategory | undefined
): string {
  if (typeof category === "string") return category;
  return category?.name || "Uncategorized";
}

function formatPrice(price: number | string): string {
  const amount = Number(price);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const fetchProducts = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      const response = await fetch("/api/products", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Unable to load products.");
      }

      const productList = Array.isArray(result.products)
        ? result.products
        : Array.isArray(result.data)
          ? result.data
          : [];

      setProducts(productList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(() => {
    const names = products
      .map((product) => getCategoryName(product.category))
      .filter((name) => name !== "Uncategorized");

    return Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryName = getCategoryName(product.category);

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.description || "").toLowerCase().includes(query) ||
        categoryName.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "ALL" || categoryName === categoryFilter;

      let matchesAvailability = true;

      if (availabilityFilter === "AVAILABLE") {
        matchesAvailability = product.isAvailable;
      } else if (availabilityFilter === "UNAVAILABLE") {
        matchesAvailability = !product.isAvailable;
      } else if (availabilityFilter === "LOW_STOCK") {
        matchesAvailability =
          product.stock <= 5 && product.isAvailable;
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [products, search, categoryFilter, availabilityFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, availabilityFilter]);

  const stats = useMemo(
    () => ({
      total: products.length,
      available: products.filter((p) => p.isAvailable).length,
      unavailable: products.filter((p) => !p.isAvailable).length,
      lowStock: products.filter(
        (p) => p.isAvailable && p.stock <= 5
      ).length,
    }),
    [products]
  );

  const deactivateProduct = async (product: Product) => {
    if (!product.isAvailable) return;

    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${product.name}"? It will no longer be available to customers.`
    );

    if (!confirmed) return;

    try {
      setActionId(product.id);
      setNotice("");
      setError("");

      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Unable to deactivate product.");
      }

      setProducts((previous) =>
        previous.map((item) =>
          item.id === product.id
            ? { ...item, isAvailable: false }
            : item
        )
      );

      setNotice(`${product.name} has been deactivated.`);
    } catch (err) {
      window.alert(
        err instanceof Error
          ? err.message
          : "Unable to deactivate product."
      );
    } finally {
      setActionId(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("ALL");
    setAvailabilityFilter("ALL");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Package size={16} />
            <span>Admin</span>
            <span>/</span>
            <span>Products</span>
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Products
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your coffee shop products, pricing and stock.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchProducts(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <Link
            href="/admin/products/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            <Plus size={17} />
            Add Product
          </Link>
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total Products",
            value: stats.total,
            icon: Package,
            color: "text-slate-700",
            bg: "bg-slate-100",
          },
          {
            label: "Available",
            value: stats.available,
            icon: Eye,
            color: "text-green-700",
            bg: "bg-green-100",
          },
          {
            label: "Unavailable",
            value: stats.unavailable,
            icon: EyeOff,
            color: "text-red-700",
            bg: "bg-red-100",
          },
          {
            label: "Low Stock",
            value: stats.lowStock,
            icon: AlertTriangle,
            color: "text-amber-700",
            bg: "bg-amber-100",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 sm:text-sm">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </div>

                <div className={`rounded-xl p-3 ${stat.bg}`}>
                  <Icon size={20} className={stat.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <SlidersHorizontal size={17} />
          Search and filters
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, description..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          >
            <option value="ALL">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={availabilityFilter}
            onChange={(e) =>
              setAvailabilityFilter(
                e.target.value as AvailabilityFilter
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
          >
            <option value="ALL">All Products</option>
            <option value="AVAILABLE">Available</option>
            <option value="UNAVAILABLE">Unavailable</option>
            <option value="LOW_STOCK">Low Stock (5 or less)</option>
          </select>
        </div>

        {(search || categoryFilter !== "ALL" || availabilityFilter !== "ALL") && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Showing {filteredProducts.length} matching products
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => fetchProducts()}
            className="mt-2 text-sm font-semibold text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <div className="h-44 bg-slate-200" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : !error && paginatedProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <Package size={38} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-lg font-semibold text-slate-800">
            No products found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Try changing your search or filters, or add a new product.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedProducts.map((product) => {
              const categoryName = getCategoryName(product.category);
              const isLowStock =
                product.stock <= 5 && product.isAvailable;

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-slate-100">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package size={42} className="text-slate-300" />
                      </div>
                    )}

                    <div className="absolute left-3 top-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          product.isAvailable
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>

                    {isLowStock && (
                      <div className="absolute right-3 top-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          <AlertTriangle size={12} />
                          Low stock
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-slate-900">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {categoryName}
                        </p>
                      </div>

                      <p className="shrink-0 text-base font-bold text-amber-700">
                        {formatPrice(product.price)}
                      </p>
                    </div>

                    <p className="min-h-10 text-sm leading-5 text-slate-500">
                      {product.description || "No description available."}
                    </p>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                      <span className="text-xs font-medium text-slate-500">
                        Available stock
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          isLowStock ? "text-amber-700" : "text-slate-800"
                        }`}
                      >
                        {product.stock}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link
                        href={`/admin/products/edit/${product.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil size={15} />
                        Edit
                      </Link>

                      <Link
                        href={`/admin/products/${product.id}/customizations`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                      >
                        <SlidersHorizontal size={15} />
                        Customize
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() => deactivateProduct(product)}
                      disabled={!product.isAvailable || actionId === product.id}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <EyeOff size={14} />
                      {actionId === product.id
                        ? "Deactivating..."
                        : product.isAvailable
                          ? "Deactivate Product"
                          : "Product Deactivated"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-800">
                {filteredProducts.length === 0
                  ? 0
                  : (safePage - 1) * PAGE_SIZE + 1}
                {"–"}
                {Math.min(safePage * PAGE_SIZE, filteredProducts.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-800">
                {filteredProducts.length}
              </span>{" "}
              products
            </p>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="px-2 text-sm font-medium text-slate-600">
                {safePage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
